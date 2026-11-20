// Likes and comments on profile photos. (Photos that belong to an activity
// post use that post's own likes and comments, see posts.ts.)

import { AppError } from "../core/errors.ts";
import { mutation, query } from "../core/functions.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import { getCurrentUserDoc, requireUser } from "../lib/auth.ts";
import { cleanBody, COMMENT_MAX, loadFeedAuthor } from "../lib/posts.ts";

const COMMENTS_SHOWN = 100;

export const toggleLike = mutation({
  args: { photoId: v.id("profilePhotos") },
  handler: async (ctx, { photoId }) => {
    const me = await requireUser(ctx);
    const photo = await ctx.db.get("profilePhotos", photoId);
    if (!photo) throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
    const existing = await ctx.db.first(
      "photoLikes",
      sql`where photo_id = ${photoId}::uuid and user_id = ${me._id}::uuid`,
    );
    if (existing) {
      await ctx.db.delete("photoLikes", existing._id);
      return false;
    }
    await ctx.db.insert("photoLikes", { photoId, userId: me._id });
    return true;
  },
});

/** Comments on a profile photo, newest first. */
export const comments = query({
  args: { photoId: v.id("profilePhotos") },
  handler: async (ctx, { photoId }) => {
    const me = await getCurrentUserDoc(ctx);
    const rows = await ctx.db.select(
      "photoComments",
      sql`where photo_id = ${photoId}::uuid order by created_at desc, id desc limit ${COMMENTS_SHOWN}::int`,
    );
    return await Promise.all(
      rows.map(async (c) => ({
        _id: c._id,
        _creationTime: c._creationTime,
        body: c.body,
        author: await loadFeedAuthor(ctx, c.authorId),
        canDelete: !!me && (me._id === c.authorId || me.role === "admin"),
      })),
    );
  },
});

export const addComment = mutation({
  args: { photoId: v.id("profilePhotos"), body: v.string() },
  handler: async (ctx, { photoId, body }) => {
    const me = await requireUser(ctx);
    const photo = await ctx.db.get("profilePhotos", photoId);
    if (!photo) throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
    const text = cleanBody(body, COMMENT_MAX, "Comment", true);
    return await ctx.db.insert("photoComments", { photoId, authorId: me._id, body: text });
  },
});

export const removeComment = mutation({
  args: { commentId: v.id("photoComments") },
  handler: async (ctx, { commentId }) => {
    const me = await requireUser(ctx);
    const comment = await ctx.db.get("photoComments", commentId);
    if (!comment) return null;
    if (comment.authorId !== me._id && me.role !== "admin")
      throw new AppError({ code: "FORBIDDEN", message: "You can't delete this comment" });
    await ctx.db.delete("photoComments", commentId);
    return null;
  },
});
