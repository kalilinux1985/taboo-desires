import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { isUuid, paginationOptsValidator, v } from "../core/values.ts";
import { FORUM_TOPIC_IDS } from "../domain/enums.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import { requireCapability } from "../lib/access.ts";
import { POST_MAX, REPLY_MAX, TITLE_MAX, TITLE_MIN } from "../domain/forum.ts";

const forumTopicValidator = v.union(
  ...FORUM_TOPIC_IDS.map((t) => v.literal(t)),
);

type Author = {
  _id: Id<"users">;
  name: string;
  accountType: "seller" | "buyer" | null;
};

async function loadAuthor(ctx: QueryCtx, userId: Id<"users">): Promise<Author> {
  const user = await ctx.db.get("users", userId);
  if (!user) return { _id: userId, name: "Deleted user", accountType: null };
  return {
    _id: user._id,
    name: publicSellerName(user),
    accountType: user.accountType ?? null,
  };
}

function cleanText(raw: string, max: number, label: string, min = 1): string {
  const text = raw.trim();
  if (text.length < min || text.length > max) {
    throw new AppError({
      code: "BAD_REQUEST",
      message: `${label} must be ${min}-${max} characters`,
    });
  }
  return text;
}

function canModerate(
  user: Doc<"users"> | null,
  authorId: Id<"users">,
): boolean {
  return !!user && (user.role === "admin" || user._id === authorId);
}

export const listThreads = query({
  args: {
    topic: v.optional(forumTopicValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { topic, paginationOpts }) => {
    const result = await ctx.db.paginate(
      "threads",
      {
        where: topic ? sql`topic = ${topic}` : undefined,
        order: [{ column: "last_activity_at", cast: "timestamptz" }],
        direction: "desc",
      },
      paginationOpts,
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (t) => ({
          _id: t._id,
          _creationTime: t._creationTime,
          topic: t.topic,
          title: t.title,
          // Short preview keeps list payloads small
          preview: t.body.slice(0, 180),
          replyCount: t.replyCount,
          lastActivityAt: t.lastActivityAt,
          author: await loadAuthor(ctx, t.authorId),
        })),
      ),
    };
  },
});

export const getThread = query({
  // Plain string so a malformed URL shows "not found" instead of throwing
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const thread = isUuid(args.threadId)
      ? await ctx.db.get("threads", args.threadId)
      : null;
    if (!thread) return null;
    const me = await getCurrentUserDoc(ctx);
    return {
      ...thread,
      author: await loadAuthor(ctx, thread.authorId),
      canDelete: canModerate(me, thread.authorId),
      meId: me?._id ?? null,
      isAdmin: me?.role === "admin",
    };
  },
});

export const listReplies = query({
  args: { threadId: v.id("threads"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { threadId, paginationOpts }) => {
    const result = await ctx.db.paginate(
      "replies",
      {
        where: sql`thread_id = ${threadId}::uuid`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "asc",
      },
      paginationOpts,
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => ({
          ...r,
          author: await loadAuthor(ctx, r.authorId),
        })),
      ),
    };
  },
});

export const createThread = mutation({
  args: { topic: forumTopicValidator, title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCapability(ctx, "post");
    return await ctx.db.insert("threads", {
      authorId: user._id,
      topic: args.topic,
      title: cleanText(args.title, TITLE_MAX, "Title", TITLE_MIN),
      body: cleanText(args.body, POST_MAX, "Post"),
      replyCount: 0,
      lastActivityAt: new Date(ctx.now()).toISOString(),
    });
  },
});

export const reply = mutation({
  args: { threadId: v.id("threads"), body: v.string() },
  handler: async (ctx, { threadId, body }) => {
    const user = await requireCapability(ctx, "post");
    const thread = await ctx.db.get("threads", threadId);
    if (!thread)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Discussion not found",
      });
    const replyId = await ctx.db.insert("replies", {
      threadId,
      authorId: user._id,
      body: cleanText(body, REPLY_MAX, "Reply"),
    });
    await ctx.db.patch("threads", threadId, {
      replyCount: thread.replyCount + 1,
      lastActivityAt: new Date(ctx.now()).toISOString(),
    });
    return replyId;
  },
});

export const deleteReply = mutation({
  args: { replyId: v.id("replies") },
  handler: async (ctx, { replyId }) => {
    const user = await requireUser(ctx);
    const reply = await ctx.db.get("replies", replyId);
    if (!reply) return null;
    if (!canModerate(user, reply.authorId))
      throw new AppError({
        code: "FORBIDDEN",
        message: "You can't delete this reply",
      });
    await ctx.db.delete("replies", replyId);
    const thread = await ctx.db.get("threads", reply.threadId);
    if (thread) {
      await ctx.db.patch("threads", thread._id, {
        replyCount: Math.max(0, thread.replyCount - 1),
      });
    }
    return null;
  },
});

/** Deletes a discussion; its replies go with it (foreign key cascade). */
export const deleteThread = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const user = await requireUser(ctx);
    const thread = await ctx.db.get("threads", threadId);
    if (!thread) return null;
    if (!canModerate(user, thread.authorId))
      throw new AppError({
        code: "FORBIDDEN",
        message: "You can't delete this discussion",
      });
    await ctx.db.delete("threads", threadId);
    return null;
  },
});
