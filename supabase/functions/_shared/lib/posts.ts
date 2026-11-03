import { AppError } from "../core/errors.ts";
import type { QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { publicSellerName } from "./auth.ts";

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
export async function toFeedItem(
  ctx: QueryCtx,
  post: Doc<"posts">,
  me: Doc<"users"> | null,
) {
  const [author, imageUrls, listing, myLike] = await Promise.all([
    loadFeedAuthor(ctx, post.authorId),
    Promise.all(post.imageIds.map((id) => ctx.storage.getUrl(id))),
    post.listingId ? loadListingPreview(ctx, post.listingId) : null,
    me
      ? ctx.db.first(
          "postLikes",
          sql`where post_id = ${post._id}::uuid and user_id = ${me._id}::uuid`,
        )
      : null,
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
    canDelete: !!me && (me._id === post.authorId || me.role === "admin"),
    author,
  };
}
