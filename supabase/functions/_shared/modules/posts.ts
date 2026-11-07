import { AppError } from "../core/errors.ts";
import { mutation, query } from "../core/functions.ts";
import { sql, type Sql } from "../core/sql.ts";
import type { Doc } from "../core/schema.ts";
import type { OrderColumn } from "../core/db.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import { getCurrentUserDoc, requireUser } from "../lib/auth.ts";
import { requireCapability } from "../lib/access.ts";
import { assertOwnFiles } from "../lib/files.ts";
import {
  COMMENT_MAX,
  POST_BODY_MAX,
  POST_IMAGES_MAX,
  cleanBody,
  deletePostCascade,
  COMMENT_LIKERS_SHOWN,
  insertListingPost,
  loadCommentLikers,
  loadFeedAuthor,
  loadPostLikers,
  toFeedItem,
} from "../lib/posts.ts";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const filterValidator = v.union(
  v.literal("all"),
  v.literal("photo"),
  v.literal("listing"),
  v.literal("status"),
);
const sortValidator = v.union(v.literal("newest"), v.literal("popular"));

/** Paginated activity feed, filtered and sorted through indexes. */
export const feed = query({
  args: {
    filter: filterValidator,
    sort: sortValidator,
    paginationOpts: paginationOptsValidator,
    /** Only this member's posts (their profile's Latest activity) */
    authorId: v.optional(v.id("users")),
  },
  handler: async (ctx, { filter, sort, paginationOpts, authorId }) => {
    const me = await getCurrentUserDoc(ctx);
    const order: OrderColumn[] =
      sort === "popular"
        ? [
            { column: "like_count", cast: "int" },
            { column: "created_at", cast: "timestamptz" },
          ]
        : [{ column: "created_at", cast: "timestamptz" }];
    const result = await ctx.db.paginate(
      "posts",
      {
        where: [
          filter === "all" ? null : sql`kind = ${filter}`,
          authorId ? sql`author_id = ${authorId}::uuid` : null,
        ]
          .filter((w): w is NonNullable<typeof w> => w !== null)
          .reduce<Sql | undefined>((acc, w) => (acc ? sql`${acc} and ${w}` : w), undefined),
        order,
        direction: "desc",
      },
      paginationOpts,
    );
    return {
      ...result,
      page: await Promise.all(result.page.map((p) => toFeedItem(ctx, p, me))),
    };
  },
});

/** Which of the given authors are online. Kept apart from the feed so heartbeats don't refresh it. */
export const onlineAuthors = query({
  args: { userIds: v.array(v.id("users"), 500) },
  handler: async (ctx, { userIds }) => {
    const unique = [...new Set(userIds)].slice(0, 100);
    if (unique.length === 0) return [];
    const since = new Date(ctx.now() - ONLINE_WINDOW_MS).toISOString();
    const rows = await ctx.db.select(
      "presence",
      sql`where user_id = any(${unique}::uuid[]) and last_seen_at > ${since}::timestamptz`,
    );
    return rows.map((r) => r.userId);
  },
});

export const create = mutation({
  args: { body: v.string(), imageIds: v.array(v.storageId(), 20) },
  handler: async (ctx, { body, imageIds }) => {
    const me = await requireCapability(ctx, "post");
    if (imageIds.length > POST_IMAGES_MAX) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: `Add up to ${POST_IMAGES_MAX} photos`,
      });
    }
    assertOwnFiles(imageIds, me._id, "public");
    const text = cleanBody(body, POST_BODY_MAX, "Post", imageIds.length === 0);
    return await ctx.db.insert("posts", {
      authorId: me._id,
      kind: imageIds.length > 0 ? "photo" : "status",
      repost: false,
      body: text,
      imageIds,
      likeCount: 0,
      commentCount: 0,
    });
  },
});

/** Sellers can re-share one of their active listings to the top of the feed. */
export const repostListing = mutation({
  args: { listingId: v.id("listings"), body: v.string() },
  handler: async (ctx, { listingId, body }) => {
    const me = await requireCapability(ctx, "post");
    const listing = await ctx.db.get("listings", listingId);
    if (!listing)
      throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
    if (listing.sellerId !== me._id)
      throw new AppError({ code: "FORBIDDEN", message: "Not your listing" });
    if (listing.status !== "active") {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Only active listings can be reposted",
      });
    }
    return await insertListingPost(
      ctx,
      listing,
      true,
      cleanBody(body, POST_BODY_MAX, "Post", false),
    );
  },
});

export const remove = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const me = await requireUser(ctx);
    const post = await ctx.db.get("posts", postId);
    if (!post) return null;
    if (post.authorId !== me._id && me.role !== "admin") {
      throw new AppError({ code: "FORBIDDEN", message: "Not your post" });
    }
    await deletePostCascade(ctx, post);
    return null;
  },
});

export const toggleLike = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const me = await requireUser(ctx);
    const post = await ctx.db.get("posts", postId);
    if (!post)
      throw new AppError({ code: "NOT_FOUND", message: "Post not found" });
    const existing = await ctx.db.first(
      "postLikes",
      sql`where post_id = ${postId}::uuid and user_id = ${me._id}::uuid`,
    );
    if (existing) {
      await ctx.db.delete("postLikes", existing._id);
      await ctx.db.patch("posts", postId, {
        likeCount: Math.max(0, post.likeCount - 1),
      });
      return false;
    }
    await ctx.db.insert("postLikes", { postId, userId: me._id });
    await ctx.db.patch("posts", postId, { likeCount: post.likeCount + 1 });
    return true;
  },
});

/** Top-level comments on a post, or the replies to one comment (parentId). */
export const listComments = query({
  args: {
    postId: v.id("posts"),
    parentId: v.optional(v.id("postComments")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { postId, parentId, paginationOpts }) => {
    const me = await getCurrentUserDoc(ctx);
    const result = await ctx.db.paginate(
      "postComments",
      {
        where: parentId
          ? sql`post_id = ${postId}::uuid and parent_id = ${parentId}::uuid`
          : sql`post_id = ${postId}::uuid and parent_id is null`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        // Newest comments first; replies read top to bottom in order
        direction: parentId ? "asc" : "desc",
      },
      paginationOpts,
    );
    const ids = result.page.map((c) => c._id);
    const liked = new Set<string>();
    if (me && ids.length) {
      ctx.db.touch("postCommentLikes");
      const rows = await ctx.db.rows(sql`
        select comment_id from public.post_comment_likes
         where user_id = ${me._id}::uuid and comment_id = any(${ids}::uuid[])`);
      for (const r of rows) liked.add(String(r.comment_id));
    }
    const likers = await loadCommentLikers(
      ctx,
      result.page.filter((c) => (c.likeCount ?? 0) > 0).map((c) => c._id),
      COMMENT_LIKERS_SHOWN,
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (c) => ({
          _id: c._id,
          _creationTime: c._creationTime,
          body: c.body,
          likeCount: c.likeCount ?? 0,
          replyCount: c.replyCount ?? 0,
          likedByMe: liked.has(c._id),
          likers: likers.get(c._id) ?? [],
          author: await loadFeedAuthor(ctx, c.authorId),
          canDelete: !!me && (me._id === c.authorId || me.role === "admin"),
        })),
      ),
    };
  },
});

/** Everyone who liked a post (newest first, up to 100), for "More+". */
export const likers = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get("posts", postId);
    if (!post) return [];
    return loadPostLikers(ctx, postId, 100);
  },
});

/** Comment on a post, or reply to a comment (replies stay one level deep). */
export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    body: v.string(),
    parentId: v.optional(v.id("postComments")),
  },
  handler: async (ctx, { postId, body, parentId }) => {
    const me = await requireCapability(ctx, "post");
    const post = await ctx.db.get("posts", postId);
    if (!post)
      throw new AppError({ code: "NOT_FOUND", message: "Post not found" });
    let parent: Doc<"postComments"> | null = null;
    if (parentId) {
      parent = await ctx.db.get("postComments", parentId);
      if (!parent || parent.postId !== postId)
        throw new AppError({ code: "NOT_FOUND", message: "Comment not found" });
      // Replying to a reply joins the same thread
      if (parent.parentId) parent = await ctx.db.get("postComments", parent.parentId);
      if (!parent)
        throw new AppError({ code: "NOT_FOUND", message: "Comment not found" });
    }
    const text = cleanBody(body, COMMENT_MAX, "Comment", true);
    const id = await ctx.db.insert("postComments", {
      postId,
      authorId: me._id,
      body: text,
      parentId: parent?._id,
      likeCount: 0,
      replyCount: 0,
    });
    if (parent)
      await ctx.db.patch("postComments", parent._id, {
        replyCount: (parent.replyCount ?? 0) + 1,
      });
    await ctx.db.patch("posts", postId, {
      commentCount: post.commentCount + 1,
    });
    return id;
  },
});

export const removeComment = mutation({
  args: { commentId: v.id("postComments") },
  handler: async (ctx, { commentId }) => {
    const me = await requireUser(ctx);
    const comment = await ctx.db.get("postComments", commentId);
    if (!comment) return null;
    if (comment.authorId !== me._id && me.role !== "admin") {
      throw new AppError({ code: "FORBIDDEN", message: "Not your comment" });
    }
    // Replies go with their comment
    const removed = 1 + (comment.parentId ? 0 : (comment.replyCount ?? 0));
    await ctx.db.delete("postComments", commentId);
    if (comment.parentId) {
      const parent = await ctx.db.get("postComments", comment.parentId);
      if (parent)
        await ctx.db.patch("postComments", parent._id, {
          replyCount: Math.max(0, (parent.replyCount ?? 0) - 1),
        });
    }
    const post = await ctx.db.get("posts", comment.postId);
    if (post)
      await ctx.db.patch("posts", post._id, {
        commentCount: Math.max(0, post.commentCount - removed),
      });
    return null;
  },
});

/** Like or unlike a comment; returns whether it's now liked. */
export const toggleCommentLike = mutation({
  args: { commentId: v.id("postComments") },
  handler: async (ctx, { commentId }) => {
    const me = await requireUser(ctx);
    const comment = await ctx.db.get("postComments", commentId);
    if (!comment)
      throw new AppError({ code: "NOT_FOUND", message: "Comment not found" });
    const existing = await ctx.db.first(
      "postCommentLikes",
      sql`where comment_id = ${commentId}::uuid and user_id = ${me._id}::uuid`,
    );
    if (existing) {
      await ctx.db.delete("postCommentLikes", existing._id);
      await ctx.db.patch("postComments", commentId, {
        likeCount: Math.max(0, (comment.likeCount ?? 0) - 1),
      });
      return false;
    }
    await ctx.db.insert("postCommentLikes", { commentId, userId: me._id });
    await ctx.db.patch("postComments", commentId, {
      likeCount: (comment.likeCount ?? 0) + 1,
    });
    return true;
  },
});
