// Taboo Coins: balance and history, paying for items and Instant Content,
// and the admin tool that grants coins (until coin packs can be bought).

import { AppError } from "../core/errors.ts";
import { mutation, query } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import { COIN_PACKS, GRANT_MAX, coinsFor, formatCoins } from "../domain/coins.ts";
import { getCurrentUserDoc, publicSellerName } from "../lib/auth.ts";
import { requireCapability } from "../lib/access.ts";
import { moveCoins, payCoins } from "../lib/coins.ts";
import { queueEmail } from "../lib/email.ts";
import { getUnlock } from "../lib/lockedContent.ts";
import { bumpStats } from "../lib/sellerStats.ts";
import { requireAdmin } from "../lib/subscription.ts";
import { createOrder } from "./orders.ts";

/** My balance and my last 50 coin movements, with the other member's username. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    ctx.db.touch("coinLedger", "users");
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const rows = await ctx.db.select("coinLedger", sql`where user_id = ${me._id}::uuid order by created_at desc, id desc limit 50`);
    const uniq = <T,>(ids: (T | undefined)[]) => [...new Set(ids.filter((x): x is T => !!x))];
    const listings = new Map(
      await Promise.all(uniq(rows.map((r) => r.listingId)).map(async (id) => [id, await ctx.db.get("listings", id)] as const)),
    );
    const orders = new Map(
      await Promise.all(uniq(rows.map((r) => r.orderId)).map(async (id) => [id, await ctx.db.get("orders", id)] as const)),
    );
    // Who the coins came from or went to. Admin grants show as Taboo Desires, never the admin.
    const otherId = (r: (typeof rows)[number]): Id<"users"> | undefined => {
      const listing = r.listingId ? listings.get(r.listingId) : null;
      const order = r.orderId ? orders.get(r.orderId) : null;
      switch (r.kind) {
        case "sale":
        case "unlock_sale":
          return r.actorId ?? order?.buyerId;
        case "purchase":
        case "unlock":
          return order?.sellerId ?? listing?.sellerId;
        case "refund":
          return order?.sellerId ?? listing?.sellerId;
        case "refund_sale":
          return order?.buyerId;
        default:
          return undefined;
      }
    };
    const others = new Map(
      await Promise.all(
        uniq(rows.map(otherId)).map(async (id) => [id, (await ctx.db.get("users", id))?.username ?? null] as const),
      ),
    );
    return {
      balance: me.coinBalance ?? 0,
      packs: COIN_PACKS,
      history: rows.map((r) => {
        const other = otherId(r);
        return {
          _id: r._id,
          _creationTime: r._creationTime,
          delta: r.delta,
          balanceAfter: r.balanceAfter,
          kind: r.kind,
          listingTitle: r.listingId ? (listings.get(r.listingId)?.title ?? null) : null,
          /** The other member's username (no display name); null for coin packs and grants */
          otherUsername: other ? (others.get(other) ?? null) : null,
          note: r.note ?? null,
        };
      }),
    };
  },
});

/** Pay for a regular item with coins: an order is created and the listing is sold. */
export const payListing = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await requireCapability(ctx, "buy");
    const listing = await ctx.db.get("listings", listingId);
    if (!listing || listing.paywall) throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
    if (listing.sellerId === me._id) throw new AppError({ code: "BAD_REQUEST", message: "This is your own listing" });
    if (listing.status !== "active" || listing.saleType !== "fixed")
      throw new AppError({ code: "CONFLICT", message: "This listing is no longer for sale" });
    const amount = coinsFor(listing.priceCents);
    const orderId = await createOrder(ctx, { sellerId: listing.sellerId, buyerId: me._id, listingId, title: listing.title });
    await ctx.db.patch("orders", orderId, { coinAmount: amount });
    await payCoins(ctx, me._id, listing.sellerId, amount, { buyer: "purchase", seller: "sale" }, { listingId, orderId, actorId: me._id });
    await ctx.db.patch("listings", listingId, { status: "sold" });
    await bumpStats(ctx, listing.sellerId, { salesCount: 1 });
    return orderId;
  },
});

/** Unlock Instant Content with coins: access is granted straight away. */
export const payUnlock = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await requireCapability(ctx, "buy");
    const listing = await ctx.db.get("listings", listingId);
    if (!listing?.paywall) throw new AppError({ code: "NOT_FOUND", message: "Instant Content not found" });
    if (listing.sellerId === me._id) throw new AppError({ code: "BAD_REQUEST", message: "This is your own listing" });
    if (listing.status !== "active") throw new AppError({ code: "CONFLICT", message: "This is no longer for sale" });
    const now = new Date(ctx.now()).toISOString();
    const existing = await getUnlock(ctx, listingId, me._id);
    if (existing?.status === "granted" && existing.grantedAt && Date.parse(existing.grantedAt) + 24 * 3600_000 > ctx.now())
      throw new AppError({ code: "CONFLICT", message: "You already have access" });
    const amount = coinsFor(listing.priceCents);
    await payCoins(ctx, me._id, listing.sellerId, amount, { buyer: "unlock", seller: "unlock_sale" }, { listingId, actorId: me._id });
    if (existing) await ctx.db.patch("unlocks", existing._id, { status: "granted", requestedAt: now, grantedAt: now });
    else
      await ctx.db.insert("unlocks", { listingId, buyerId: me._id, sellerId: listing.sellerId, status: "granted", requestedAt: now, grantedAt: now });
    await bumpStats(ctx, listing.sellerId, { salesCount: 1 });
    const seller = await ctx.db.get("users", listing.sellerId);
    if (seller)
      await queueEmail(ctx, {
        to: seller,
        kind: "coin_unlock",
        transactional: true,
        subject: `${publicSellerName(me)} unlocked "${listing.title}"`,
        heading: "You made a sale",
        lines: [`${publicSellerName(me)} unlocked "${listing.title}" for ${formatCoins(amount)}.`],
        button: { label: "See your coins", path: "/coins" },
        dedupeKey: `coin_unlock:${listingId}:${me._id}:${now}`,
      });
    return null;
  },
});

/** Admins add (or remove, with a negative amount) coins on a member's account, by username. */
export const grant = mutation({
  args: { username: v.string(), amount: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, { username, amount, note }) => {
    const admin = await requireAdmin(ctx);
    const n = Math.trunc(amount);
    if (!n || Math.abs(n) > GRANT_MAX) throw new AppError({ code: "BAD_REQUEST", message: `Enter 1 to ${GRANT_MAX.toLocaleString("en-US")} coins` });
    const user = await ctx.db.first("users", sql`where username = ${username.trim().replace(/^@|^\//, "").toLowerCase()}`);
    if (!user) throw new AppError({ code: "NOT_FOUND", message: "No member has that username" });
    const balance = await moveCoins(ctx, user._id as Id<"users">, n, "grant", { actorId: admin._id, note: note?.trim() || undefined });
    return { name: publicSellerName(user), balance };
  },
});

