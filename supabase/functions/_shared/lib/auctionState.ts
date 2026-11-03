import type { QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";

export async function getAuctionByListing(
  ctx: QueryCtx,
  listingId: Id<"listings">,
): Promise<Doc<"auctions"> | null> {
  return await ctx.db.first(
    "auctions",
    sql`where listing_id = ${listingId}::uuid`,
  );
}

/** Creates the auction record. It is closed by the every-minute app.close_due_auctions() job. */
export async function createAuction(
  ctx: QueryCtx,
  args: {
    listingId: Id<"listings">;
    sellerId: Id<"users">;
    startingBidCents: number;
    durationHours: number;
  },
): Promise<Id<"auctions">> {
  const endsAtMs = ctx.now() + args.durationHours * 60 * 60 * 1000;
  return await ctx.db.insert("auctions", {
    listingId: args.listingId,
    sellerId: args.sellerId,
    startingBidCents: args.startingBidCents,
    currentBidCents: args.startingBidCents,
    bidCount: 0,
    endsAt: new Date(endsAtMs).toISOString(),
    status: "live",
  });
}
