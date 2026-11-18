import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import { getCurrentUserDoc, requireUser } from "../lib/auth.ts";
import { bumpStats } from "../lib/sellerStats.ts";
import { getPlan } from "../lib/subscription.ts";
import { toCard } from "../lib/listingCard.ts";

// Feed reads a bounded slice: newest listings from up to this many followed sellers
const FEED_SELLERS_MAX = 100;
const FEED_PER_SELLER = 12;
const FEED_SIZE = 48;

async function findFollow(
  ctx: QueryCtx,
  followerId: Id<"users">,
  sellerId: Id<"users">,
) {
  return await ctx.db.first(
    "follows",
    sql`where follower_id = ${followerId}::uuid and seller_id = ${sellerId}::uuid`,
  );
}

export const isFollowing = query({
  args: { sellerId: v.id("users") },
  handler: async (ctx, { sellerId }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return "none" as const;
    const f = await findFollow(ctx, me._id, sellerId);
    return !f ? ("none" as const) : f.status === "pending" ? ("pending" as const) : ("following" as const);
  },
});

export const toggle = mutation({
  args: { sellerId: v.id("users") },
  handler: async (ctx, { sellerId }) => {
    const me = await requireUser(ctx);
    if (me._id === sellerId)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "You can't follow yourself",
      });
    const target = await ctx.db.get("users", sellerId);
    if (!target) throw new AppError({ code: "NOT_FOUND", message: "Member not found" });
    const existing = await findFollow(ctx, me._id, sellerId);
    // Unfollowing is always allowed; following is checked below
    if (!existing) {
      if (me.accountType === "seller" && me.role !== "admin") {
        // Premium sellers can follow anyone
        if ((await getPlan(ctx, me._id)) !== "pro")
          throw new AppError({ code: "FORBIDDEN", message: "Upgrade to Premium to follow members" });
      } else if (target.accountType !== "seller" && target.role !== "admin") {
        // Buyers can follow sellers
        throw new AppError({ code: "BAD_REQUEST", message: "You can only follow sellers" });
      }
    }
    // Unfollow, or cancel a request that hasn't been answered
    if (existing) {
      await ctx.db.delete("follows", existing._id);
      if (existing.status === "accepted") await bumpStats(ctx, sellerId, { followerCount: -1 });
      return "none" as const;
    }
    // A follow is a request until the seller accepts it
    await ctx.db.insert("follows", { followerId: me._id, sellerId, status: "pending" });
    return "pending" as const;
  },
});

/** The seller accepts or deletes a follow request. */
export const respond = mutation({
  args: { followerId: v.id("users"), accept: v.boolean() },
  handler: async (ctx, { followerId, accept }) => {
    const me = await requireUser(ctx);
    const req = await findFollow(ctx, followerId, me._id);
    if (!req) throw new AppError({ code: "NOT_FOUND", message: "That follow request is gone" });
    if (!accept) {
      await ctx.db.delete("follows", req._id);
      if (req.status === "accepted") await bumpStats(ctx, me._id, { followerCount: -1 });
      return null;
    }
    if (req.status === "pending") {
      await ctx.db.patch("follows", req._id, { status: "accepted" });
      await bumpStats(ctx, me._id, { followerCount: 1 });
    }
    return null;
  },
});

/** Newest active listings from sellers the signed-in user follows. */
export const feed = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    ctx.db.touch("follows");
    const followingCount = Number(
      await ctx.db.scalar(sql`
        select count(*)::int from (
          select 1 from public.follows where follower_id = ${me._id}::uuid and status = 'accepted' limit ${FEED_SELLERS_MAX}
        ) f`),
    );
    // Newest few per followed seller, then newest overall
    const newest = await ctx.db.docs(
      "listings",
      sql`
        select l.* from (
          select seller_id from public.follows
           where follower_id = ${me._id}::uuid and status = 'accepted' order by created_at limit ${FEED_SELLERS_MAX}
        ) f
        cross join lateral (
          select * from public.listings
           where seller_id = f.seller_id and status = 'active'
           order by created_at desc, id desc limit ${FEED_PER_SELLER}
        ) l
        order by l.created_at desc, l.id desc
        limit ${FEED_SIZE}`,
    );
    return {
      followingCount,
      listings: await Promise.all(newest.map((l) => toCard(ctx, l))),
    };
  },
});
