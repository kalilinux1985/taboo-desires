import { AppError } from "../core/errors.ts";
import type { Id } from "../core/schema.ts";
import { isOwnFile, type Visibility } from "../core/storage.ts";

/**
 * Files may only be attached by the user who uploaded them, and must sit in
 * the right bucket (locked originals and verification photos must be private).
 * `alreadyAttached` ids (e.g. a listing's current photos) are always allowed.
 */
export function assertOwnFiles(
  ids: readonly Id<"_storage">[],
  userId: string,
  visibility: Visibility,
  alreadyAttached: readonly string[] = [],
) {
  for (const id of ids) {
    if (alreadyAttached.includes(id)) continue;
    if (!isOwnFile(id, userId, visibility)) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "A file is missing. Please upload it again",
      });
    }
  }
}
