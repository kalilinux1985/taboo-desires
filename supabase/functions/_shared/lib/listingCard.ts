import type { QueryCtx } from "../core/functions.ts";
import type { Doc } from "../core/schema.ts";
import { publicSellerName } from "./auth.ts";
import { getAuctionByListing } from "./auctionState.ts";
import { getPlan } from "./subscription.ts";

/** Compact listing shape used by every grid in the app. */
export async function toCard(ctx: QueryCtx, listing: Doc<"listings">) {
  const saleType = listing.saleType ?? "fixed";
  const [imageUrl, seller, auction, sellerPlan] = await Promise.all([
    listing.imageIds[0] ? ctx.storage.getUrl(listing.imageIds[0]) : null,
    ctx.db.get("users", listing.sellerId),
    saleType === "auction" ? getAuctionByListing(ctx, listing._id) : null,
    getPlan(ctx, listing.sellerId),
  ]);
  const sellerAvatarUrl = seller?.avatarStorageId
    ? await ctx.storage.getUrl(seller.avatarStorageId)
    : null;
  return {
    _id: listing._id,
    _creationTime: listing._creationTime,
    title: listing.title,
    description: listing.description.slice(0, 200),
    brand: listing.brand,
    size: listing.size,
    condition: listing.condition,
    category: listing.category,
    priceCents: listing.priceCents,
    status: listing.status,
    saleType,
    isLocked: !!listing.paywall,
    auction: auction
      ? {
          endsAt: auction.endsAt,
          bidCount: auction.bidCount,
          status: auction.status,
        }
      : null,
    imageUrl,
    sellerId: listing.sellerId,
    sellerName: seller ? publicSellerName(seller) : "Unknown seller",
    sellerIsPro: sellerPlan === "pro",
    sellerVerified: !!seller?.verified,
    sellerAvatarUrl,
    sellerCountry: seller?.sellerDetails?.country ?? null,
  };
}
