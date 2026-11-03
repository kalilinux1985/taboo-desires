import { AppError } from "../core/errors.ts";
import { mutation, query } from "../core/functions.ts";
import { sql } from "../core/sql.ts";
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
  insertListingPost,
  loadFeedAuthor,
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
  },
  handler: async (ctx, { filter, sort, paginationOpts }) => {
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
        where: filter === "all" ? undefined : sql`kind = ${filter}`,
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

export const listComments = query({
  args: { postId: v.id("posts"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { postId, paginationOpts }) => {
    const me = await getCurrentUserDoc(ctx);
    const result = await ctx.db.paginate(
      "postComments",
      {
        where: sql`post_id = ${postId}::uuid`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc",
      },
      paginationOpts,
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (c) => ({
          _id: c._id,
          _creationTime: c._creationTime,
          body: c.body,
          author: await loadFeedAuthor(ctx, c.authorId),
          canDelete: !!me && (me._id === c.authorId || me.role === "admin"),
        })),
      ),
    };
  },
});

export const addComment = mutation({
  args: { postId: v.id("posts"), body: v.string() },
  handler: async (ctx, { postId, body }) => {
    const me = await requireCapability(ctx, "post");
    const post = await ctx.db.get("posts", postId);
    if (!post)
      throw new AppError({ code: "NOT_FOUND", message: "Post not found" });
    const text = cleanBody(body, COMMENT_MAX, "Comment", true);
    const id = await ctx.db.insert("postComments", {
      postId,
      authorId: me._id,
      body: text,
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
    await ctx.db.delete("postComments", commentId);
    const post = await ctx.db.get("posts", comment.postId);
    if (post)
      await ctx.db.patch("posts", post._id, {
        commentCount: Math.max(0, post.commentCount - 1),
      });
    return null;
  },
});
