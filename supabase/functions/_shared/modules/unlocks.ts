import { AppError } from "../core/errors.ts";
import { mutation, query } from "../core/functions.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import { getUnlock } from "../lib/lockedContent.ts";
import { bumpStats } from "../lib/sellerStats.ts";
import { requireCapability } from "../lib/access.ts";

const PENDING_LIMIT = 50;

/**
 * Buyer asks to purchase a locked listing. There's no payment processor yet,
 * so the buyer pays the seller directly and the seller grants access.
 */
export const request = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const user = await requireCapability(ctx, "buy");
    const listing = await ctx.db.get("listings", listingId);
    if (!listing?.paywall)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Locked listing not found",
      });
    if (listing.sellerId === user._id)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "This is your own listing",
      });
    if (listing.status !== "active")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "This listing is no longer for sale",
      });

    const existing = await getUnlock(ctx, listingId, user._id);
    const requestedAt = new Date(ctx.now()).toISOString();
    if (!existing) {
      await ctx.db.insert("unlocks", {
        listingId,
        buyerId: user._id,
        sellerId: listing.sellerId,
        status: "pending",
        requestedAt,
      });
    } else if (existing.status === "declined") {
      await ctx.db.patch("unlocks", existing._id, {
        status: "pending",
        requestedAt,
      });
    }
    return null;
  },
});

/** Seller's queue of purchase requests for one of their locked listings. */
export const pendingForListing = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await getCurrentUserDoc(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!me || !listing || listing.sellerId !== me._id) return [];
    const rows = await ctx.db.select(
      "unlocks",
      sql`where listing_id = ${listingId}::uuid and status = 'pending' order by created_at, id limit ${PENDING_LIMIT}`,
    );
    const buyers = await Promise.all(
      rows.map((r) => ctx.db.get("users", r.buyerId)),
    );
    return rows.map((r, i) => {
      const buyer = buyers[i];
      return {
        _id: r._id,
        requestedAt: r.requestedAt,
        buyerName: buyer ? publicSellerName(buyer) : "Deleted user",
      };
    });
  },
});

export const respond = mutation({
  args: { unlockId: v.id("unlocks"), grant: v.boolean() },
  handler: async (ctx, { unlockId, grant }) => {
    const user = await requireUser(ctx);
    const unlock = await ctx.db.get("unlocks", unlockId);
    if (!unlock)
      throw new AppError({ code: "NOT_FOUND", message: "Request not found" });
    if (unlock.sellerId !== user._id)
      throw new AppError({ code: "FORBIDDEN", message: "Not your listing" });
    if (unlock.status !== "pending") return null;
    await ctx.db.patch("unlocks", unlockId, {
      status: grant ? "granted" : "declined",
    });
    // Each granted paywall purchase counts as a sale
    if (grant) await bumpStats(ctx, unlock.sellerId, { salesCount: 1 });
    return null;
  },
});
