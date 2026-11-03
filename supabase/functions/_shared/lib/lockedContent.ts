import { AppError } from "../core/errors.ts";
import type { QueryCtx } from "../core/functions.ts";
import type { Doc, Id, LockedMedia } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { LOCKED_MEDIA_MAX } from "../domain/plans.ts";
import { assertOwnFiles } from "./files.ts";

export type { LockedMedia };

export async function getUnlock(
  ctx: QueryCtx,
  listingId: Id<"listings">,
  buyerId: Id<"users">,
) {
  return await ctx.db.first(
    "unlocks",
    sql`where listing_id = ${listingId}::uuid and buyer_id = ${buyerId}::uuid`,
  );
}

/** Only the seller and buyers with a granted unlock may see the original files. */
export async function canViewLocked(
  ctx: QueryCtx,
  listing: Doc<"listings">,
  user: Doc<"users"> | null,
): Promise<boolean> {
  if (!listing.paywall || !user) return false;
  if (listing.sellerId === user._id) return true;
  return (await getUnlock(ctx, listing._id, user._id))?.status === "granted";
}

/**
 * Each locked file needs exactly one blurred public preview, the originals
 * must be private uploads, and the file type must match what the client
 * claims (checked against the type recorded at upload).
 */
export async function validateLockedMedia(
  ctx: QueryCtx,
  sellerId: Id<"users">,
  media: LockedMedia[],
  previewCount: number,
  alreadyAttached: readonly string[] = [],
) {
  const bad = (message: string) =>
    new AppError({ code: "BAD_REQUEST", message });
  if (media.length < 1) throw bad("Add at least one photo or video");
  if (media.length > LOCKED_MEDIA_MAX)
    throw bad(`Locked listings can hold up to ${LOCKED_MEDIA_MAX} files`);
  if (previewCount !== media.length)
    throw bad("Every file needs a blurred preview");
  assertOwnFiles(
    media.map((m) => m.storageId),
    sellerId,
    "private",
    alreadyAttached,
  );
  const types = await Promise.all(
    media.map((m) => ctx.storage.getContentType(m.storageId)),
  );
  types.forEach((type, i) => {
    if (type === undefined)
      throw bad("A file is missing. Please upload it again");
    // The type can be absent, so only reject a clear mismatch
    if (type && !type.startsWith(`${media[i].kind}/`))
      throw bad("Unsupported file type");
  });
}
