import { AppError } from "../core/errors.ts";
import type { QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { publicSellerName } from "./auth.ts";
import { getPlan } from "./subscription.ts";

export const POST_BODY_MAX = 1000;
export const COMMENT_MAX = 500;
export const POST_IMAGES_MAX = 4;

export function cleanBody(
  raw: string,
  max: number,
  label: string,
  required: boolean,
): string {
  const text = raw.trim();
  if (required && !text)
    throw new AppError({
      code: "BAD_REQUEST",
      message: `${label} can't be empty`,
    });
  if (text.length > max) {
    throw new AppError({
      code: "BAD_REQUEST",
      message: `${label} must be under ${max} characters`,
    });
  }
  return text;
}

/** Auto-posts "Listed a new item" or "Reposted a listing" to the activity feed. */
export async function insertListingPost(
  ctx: QueryCtx,
  listing: { _id: Id<"listings">; sellerId: Id<"users"> },
  repost: boolean,
  body = "",
) {
  return await ctx.db.insert("posts", {
    authorId: listing.sellerId,
    kind: "listing",
    repost,
    body,
    imageIds: [],
    listingId: listing._id,
    likeCount: 0,
    commentCount: 0,
  });
}

/** Deletes a post and its images. Likes and comments go with it (foreign keys cascade). */
export async function deletePostCascade(ctx: QueryCtx, post: Doc<"posts">) {
  post.imageIds.forEach((id) => ctx.storage.delete(id));
  await ctx.db.delete("posts", post._id);
}

export type FeedAuthor = {
  _id: Id<"users">;
  name: string;
  avatarUrl: string | null;
  accountType: "buyer" | "seller" | null;
  country: string | null;
  verified: boolean;
  /** Seller with an active Pro plan ("Premium Seller") */
  isPro: boolean;
};

export async function loadFeedAuthor(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<FeedAuthor> {
  const user = await ctx.db.get("users", userId);
  if (!user) {
    return {
      _id: userId,
      name: "Deleted user",
      avatarUrl: null,
      accountType: null,
      country: null,
      verified: false,
      isPro: false,
    };
  }
  const details =
    user.accountType === "buyer" ? user.buyerDetails : user.sellerDetails;
  return {
    _id: user._id,
    name: publicSellerName(user),
    avatarUrl: user.avatarStorageId
      ? await ctx.storage.getUrl(user.avatarStorageId)
      : null,
    accountType: user.accountType ?? null,
    country: details?.country ?? null,
    verified: !!user.verified,
    isPro: user.accountType === "seller" && (await getPlan(ctx, user._id)) === "pro",
  };
}

async function loadListingPreview(ctx: QueryCtx, listingId: Id<"listings">) {
  const listing = await ctx.db.get("listings", listingId);
  if (!listing) return null;
  return {
    _id: listing._id,
    title: listing.title,
    priceCents: listing.priceCents,
    status: listing.status,
    isLocked: !!listing.paywall,
    imageUrl: listing.imageIds[0]
      ? await ctx.storage.getUrl(listing.imageIds[0])
      : null,
  };
}

/** Shape sent to the feed UI. Presence is fetched separately so heartbeats don't re-run the feed. */
/** A member who liked a post or comment, shown as a small avatar. */
export type Liker = { _id: Id<"users">; name: string; avatarUrl: string | null };

/** How many liker avatars a post and a comment show before "More+". */
export const POST_LIKERS_SHOWN = 9;
export const COMMENT_LIKERS_SHOWN = 3;

async function toLikers(ctx: QueryCtx, userIds: string[]): Promise<Liker[]> {
  const authors = await Promise.all(userIds.map((id) => loadFeedAuthor(ctx, id as Id<"users">)));
  return authors
    .filter((a) => a.name !== "Deleted user")
    .map((a) => ({ _id: a._id, name: a.name, avatarUrl: a.avatarUrl }));
}

/** The most recent people who liked a post, newest first. */
export async function loadPostLikers(
  ctx: QueryCtx,
  postId: Id<"posts">,
  limit: number,
): Promise<Liker[]> {
  ctx.db.touch("postLikes");
  const rows = await ctx.db.rows(sql`
    select user_id from public.post_likes
     where post_id = ${postId}::uuid
     order by created_at desc, id desc
     limit ${limit}`);
  return toLikers(ctx, rows.map((r) => String(r.user_id)));
}

/** The most recent likers of each comment, keyed by comment id. */
export async function loadCommentLikers(
  ctx: QueryCtx,
  commentIds: string[],
  perComment: number,
): Promise<Map<string, Liker[]>> {
  const byComment = new Map<string, Liker[]>();
  if (commentIds.length === 0) return byComment;
  ctx.db.touch("postCommentLikes");
  const rows = await ctx.db.rows(sql`
    select comment_id, user_id from (
      select comment_id, user_id,
             row_number() over (partition by comment_id order by created_at desc, id desc) as n
        from public.post_comment_likes
       where comment_id = any(${commentIds}::uuid[])
    ) ranked
     where n <= ${perComment}
     order by comment_id, n`);
  const ids = new Map<string, string[]>();
  for (const r of rows) {
    const key = String(r.comment_id);
    ids.set(key, [...(ids.get(key) ?? []), String(r.user_id)]);
  }
  await Promise.all(
    [...ids].map(async ([key, users]) => byComment.set(key, await toLikers(ctx, users))),
  );
  return byComment;
}

export async function toFeedItem(
  ctx: QueryCtx,
  post: Doc<"posts">,
  me: Doc<"users"> | null,
) {
  const [author, imageUrls, listing, myLike, likers] = await Promise.all([
    loadFeedAuthor(ctx, post.authorId),
    Promise.all(post.imageIds.map((id) => ctx.storage.getUrl(id))),
    post.listingId ? loadListingPreview(ctx, post.listingId) : null,
    me
      ? ctx.db.first(
          "postLikes",
          sql`where post_id = ${post._id}::uuid and user_id = ${me._id}::uuid`,
        )
      : null,
    post.likeCount > 0 ? loadPostLikers(ctx, post._id, POST_LIKERS_SHOWN) : [],
  ]);
  return {
    _id: post._id,
    _creationTime: post._creationTime,
    kind: post.kind,
    repost: post.repost,
    body: post.body,
    images: imageUrls.filter((u): u is string => u !== null),
    listing,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    likedByMe: !!myLike,
    likers,
    canDelete: !!me && (me._id === post.authorId || me.role === "admin"),
    author,
  };
}
