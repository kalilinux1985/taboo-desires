import { AppError } from "../core/errors.ts";
import type { QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { isOwnFile, type Visibility } from "../core/storage.ts";

/**
 * Files may only be attached by the user who uploaded them, and must sit in
 * the right bucket (locked originals and verification photos must be private).
 * They must also have passed the server's privacy check (scrub-media), which
 * removes location and other hidden details. `alreadyAttached` ids (e.g. a
 * listing's current photos) are always allowed.
 */
export async function assertOwnFiles(
  ctx: QueryCtx,
  ids: readonly Id<"_storage">[],
  userId: string,
  visibility: Visibility,
  alreadyAttached: readonly string[] = [],
) {
  const fresh = ids.filter((id) => !alreadyAttached.includes(id));
  for (const id of fresh) {
    if (!isOwnFile(id, userId, visibility)) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "A file is missing. Please upload it again",
      });
    }
  }
  await assertScrubbed(ctx, fresh);
}

/** Every file has been checked and cleaned by scrub-media. */
export async function assertScrubbed(ctx: QueryCtx, ids: readonly string[]) {
  if (ids.length === 0) return;
  const rows = await ctx.db.rows(sql`
    select storage_id, status from public.media_scrubs where storage_id = any(${[...ids]}::text[])`);
  const status = new Map(rows.map((r) => [String(r.storage_id), String(r.status)]));
  for (const id of ids) {
    const s = status.get(id);
    if (s === "rejected")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "One of your files couldn't be checked for privacy. Save it as a JPEG, PNG or MP4 and upload it again",
      });
    if (s !== "clean")
      throw new AppError({
        code: "CONFLICT",
        message: "Your upload is still being checked for privacy. Try again in a moment",
      });
  }
}
