import type { QueryCtx } from "../core/functions.ts";
import type { Doc } from "../core/schema.ts";

/**
 * Removes a listing and its files. Its auction and bids, unlock requests,
 * favorites and feed posts are deleted by foreign-key cascades; conversations
 * about it are kept (their listing link is cleared).
 */
export async function deleteListingCascade(
  ctx: QueryCtx,
  listing: Doc<"listings">,
) {
  listing.imageIds.forEach((id) => ctx.storage.delete(id));
  listing.paywall?.media.forEach((m) => ctx.storage.delete(m.storageId));
  await ctx.db.delete("listings", listing._id);
}
