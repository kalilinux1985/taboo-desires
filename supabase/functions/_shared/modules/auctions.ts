import { AppError } from "../core/errors.ts";
import { internalMutation, mutation, query } from "../core/functions.ts";
import { sql } from "../core/sql.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import { createAuction, getAuctionByListing } from "../lib/auctionState.ts";
import { toCard } from "../lib/listingCard.ts";
import { getPlan } from "../lib/subscription.ts";
import { requireCapability } from "../lib/access.ts";
import {
  MAX_BID_CENTS,
  bidIncrementCents,
  extendedEndsAtMs,
  isAllowedDuration,
  maskName,
  minNextBidCents,
} from "../domain/bidding.ts";

const BID_HISTORY_LIMIT = 25;

/** Live auction state for a listing page. Every viewer refreshes when a bid lands. */
export const forListing = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const auction = await getAuctionByListing(ctx, listingId);
    if (!auction) return null;
    const [me, bids] = await Promise.all([
      getCurrentUserDoc(ctx),
      ctx.db.select(
        "bids",
        sql`where auction_id = ${auction._id}::uuid order by created_at desc, id desc limit ${BID_HISTORY_LIMIT}`,
      ),
    ]);
    const bidders = await Promise.all(
      bids.map((b) => ctx.db.get("users", b.bidderId)),
    );
    return {
      _id: auction._id,
      status: auction.status,
      endsAt: auction.endsAt,
      startingBidCents: auction.startingBidCents,
      currentBidCents: auction.currentBidCents,
      bidCount: auction.bidCount,
      minNextBidCents: minNextBidCents(auction),
      incrementCents: bidIncrementCents(auction.currentBidCents),
      iAmHighBidder: !!me && auction.highBidderId === me._id,
      iWon:
        !!me && auction.status === "ended" && auction.highBidderId === me._id,
      bids: bids.map((b, i) => {
        const bidder = bidders[i];
        return {
          _id: b._id,
          _creationTime: b._creationTime,
          amountCents: b.amountCents,
          isMe: !!me && b.bidderId === me._id,
          bidderLabel: bidder ? maskName(publicSellerName(bidder)) : "Unknown",
        };
      }),
    };
  },
});

export const placeBid = mutation({
  args: { auctionId: v.id("auctions"), amountCents: v.number() },
  handler: async (ctx, { auctionId, amountCents }) => {
    const user = await requireCapability(ctx, "buy");
    const auction = await ctx.db.get("auctions", auctionId);
    if (!auction)
      throw new AppError({ code: "NOT_FOUND", message: "Auction not found" });

    const now = ctx.now();
    const endsAtMs = Date.parse(auction.endsAt);
    if (auction.status !== "live" || endsAtMs <= now)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "This auction has ended",
      });
    if (auction.sellerId === user._id)
      throw new AppError({
        code: "FORBIDDEN",
        message: "You can't bid on your own auction",
      });
    if (auction.highBidderId === user._id)
      throw new AppError({
        code: "CONFLICT",
        message: "You're already the highest bidder",
      });
    if (!Number.isInteger(amountCents) || amountCents > MAX_BID_CENTS)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Enter a valid bid amount",
      });

    const min = minNextBidCents(auction);
    if (amountCents < min)
      throw new AppError({
        code: "BAD_REQUEST",
        message: `Bid at least $${(min / 100).toFixed(2).replace(/\.00$/, "")}`,
      });

    await ctx.db.insert("bids", { auctionId, bidderId: user._id, amountCents });
    const newEndsAtMs = extendedEndsAtMs(endsAtMs, now);
    await ctx.db.patch("auctions", auctionId, {
      currentBidCents: amountCents,
      bidCount: auction.bidCount + 1,
      highBidderId: user._id,
      endsAt: new Date(newEndsAtMs).toISOString(),
    });
    // Keep the listing price in sync so browse sorting reflects the live bid
    await ctx.db.patch("listings", auction.listingId, {
      priceCents: amountCents,
    });
    return { extended: newEndsAtMs !== endsAtMs };
  },
});

/**
 * Closes every live auction whose end time has passed (runs every minute via
 * pg_cron calling the same SQL function). Auctions extended by a late bid are
 * simply not due yet.
 */
export const closeDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const closed = await ctx.db.scalar(
      sql`select app.close_due_auctions(${new Date(ctx.now()).toISOString()}::timestamptz)`,
    );
    return Number(closed);
  },
});

/** Restarts an auction that ended with no bids. */
export const relist = mutation({
  args: { listingId: v.id("listings"), durationHours: v.number() },
  handler: async (ctx, { listingId, durationHours }) => {
    const user = await requireUser(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!listing || listing.sellerId !== user._id)
      throw new AppError({ code: "FORBIDDEN", message: "Not your listing" });
    if (listing.status !== "ended")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Only unsold auctions can be relisted",
      });
    if (!isAllowedDuration(durationHours))
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Pick a valid duration",
      });
    if ((await getPlan(ctx, user._id)) !== "pro")
      throw new AppError({
        code: "FORBIDDEN",
        message: "Relisting auctions is a Pro feature",
      });

    const old = await getAuctionByListing(ctx, listingId);
    if (old) await ctx.db.delete("auctions", old._id); // no bids, so nothing else to clean up
    await createAuction(ctx, {
      listingId,
      sellerId: user._id,
      startingBidCents: old?.startingBidCents ?? listing.priceCents,
      durationHours,
    });
    await ctx.db.patch("listings", listingId, { status: "active" });
    return null;
  },
});

/** Live auctions, soonest ending first. */
export const endingSoon = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const nowIso = new Date(ctx.now()).toISOString();
    const result = await ctx.db.paginate(
      "auctions",
      {
        // The closing job runs every minute; hide auctions that ended since its last run
        where: sql`status = 'live' and ends_at > ${nowIso}::timestamptz`,
        order: [{ column: "ends_at", cast: "timestamptz" }],
        direction: "asc",
      },
      paginationOpts,
    );
    const listings = await Promise.all(
      result.page.map((a) => ctx.db.get("listings", a.listingId)),
    );
    return {
      ...result,
      page: await Promise.all(
        listings.flatMap((l) => (l ? [toCard(ctx, l)] : [])),
      ),
    };
  },
});
