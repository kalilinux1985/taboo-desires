// Blocking: a member stops another from following or messaging them.

import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import { getCurrentUserDoc, requireUser } from "../lib/auth.ts";
import { bumpStats } from "../lib/sellerStats.ts";

/** Throws if either member has blocked the other. */
export async function assertNotBlocked(ctx: QueryCtx, a: Id<"users">, b: Id<"users">) {
  const hit = await ctx.db.first(
    "blocks",
    sql`where (blocker_id = ${a}::uuid and blocked_id = ${b}::uuid)
           or (blocker_id = ${b}::uuid and blocked_id = ${a}::uuid)`,
  );
  if (hit)
    throw new AppError({
      code: "FORBIDDEN",
      message: "You can't do this with a member who is blocked",
    });
}

/** Whether the signed-in user has blocked this member. */
export const isBlocked = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return false;
    return !!(await ctx.db.first(
      "blocks",
      sql`where blocker_id = ${me._id}::uuid and blocked_id = ${userId}::uuid`,
    ));
  },
});

/** Block or unblock a member. Blocking also removes any follow either way. */
export const toggle = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await requireUser(ctx);
    if (me._id === userId)
      throw new AppError({ code: "BAD_REQUEST", message: "You can't block yourself" });
    if (!(await ctx.db.get("users", userId)))
      throw new AppError({ code: "NOT_FOUND", message: "Member not found" });
    const existing = await ctx.db.first(
      "blocks",
      sql`where blocker_id = ${me._id}::uuid and blocked_id = ${userId}::uuid`,
    );
    if (existing) {
      await ctx.db.delete("blocks", existing._id);
      return false;
    }
    await ctx.db.insert("blocks", { blockerId: me._id, blockedId: userId });
    // Drop follows both ways, keeping follower counts right
    for (const [follower, followed] of [
      [me._id, userId],
      [userId, me._id],
    ] as const) {
      const f = await ctx.db.first(
        "follows",
        sql`where follower_id = ${follower}::uuid and seller_id = ${followed}::uuid`,
      );
      if (!f) continue;
      await ctx.db.delete("follows", f._id);
      if (f.status === "accepted") await bumpStats(ctx, followed, { followerCount: -1 });
    }
    return true;
  },
});
