import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import { getCurrentUserDoc, requireUser } from "../lib/auth.ts";
import { bumpStats } from "../lib/sellerStats.ts";
import { assertNotBlocked } from "./blocks.ts";
import { publicSellerName } from "../lib/auth.ts";
import { queueEmail, throttleKey } from "../lib/email.ts";
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
      await assertNotBlocked(ctx, me._id, sellerId);
      if (me.accountType === "seller" && me.role !== "admin") {
        // Sellers follow buyers only, and it's a Premium feature
        if ((await getPlan(ctx, me._id)) !== "pro")
          throw new AppError({ code: "FORBIDDEN", message: "Upgrade to Premium to follow buyers" });
        if (target.accountType !== "buyer")
          throw new AppError({ code: "BAD_REQUEST", message: "Sellers can only follow buyers" });
      } else if (target.accountType !== "seller" && target.role !== "admin") {
        // Buyers follow sellers only
        throw new AppError({ code: "BAD_REQUEST", message: "Buyers can only follow sellers" });
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
    await queueEmail(ctx, {
      to: target,
      kind: "follow_request",
      subject: `${publicSellerName(me)} wants to follow you`,
      heading: "New follow request",
      lines: [`${publicSellerName(me)} sent you a follow request. Accept or delete it from your notifications.`],
      button: { label: "View notifications", path: "/notifications" },
      dedupeKey: throttleKey(ctx, "follow_request", target._id, me._id),
    });
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
      const follower = await ctx.db.get("users", followerId);
      if (follower)
        await queueEmail(ctx, {
          to: follower,
          kind: "follow_accepted",
          subject: `${publicSellerName(me)} accepted your follow request`,
          heading: "Follow request accepted",
          lines: [`${publicSellerName(me)} accepted your follow request.`],
          button: { label: "View profile", path: `/seller/${me._id}` },
          dedupeKey: `follow_accepted:${req._id}`,
        });
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
