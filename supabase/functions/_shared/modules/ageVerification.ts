import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import { isOwnFile } from "../core/storage.ts";
import { getCurrentUserDoc, publicSellerName, requireUser } from "../lib/auth.ts";
import { requireAdmin } from "../lib/subscription.ts";
import { ageOn, isAdult, MIN_AGE, parseBirthDate } from "../domain/age.ts";

const REASON_MAX = 300;

async function getRow(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db.first(
    "ageVerifications",
    sql`where user_id = ${userId}::uuid`,
  );
}

const bad = (message: string) => new AppError({ code: "BAD_REQUEST", message });

/** Checks a private image the member uploaded themselves. */
async function requireOwnImage(
  ctx: QueryCtx,
  storageId: Id<"_storage">,
  userId: Id<"users">,
) {
  if (!isOwnFile(storageId, userId, "private"))
    throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
  const contentType = await ctx.storage.getContentType(storageId);
  if (contentType === undefined)
    throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
  if (contentType && !contentType.startsWith("image/"))
    throw bad("Please upload photos only");
}

/** The signed-in member's age check: whether it's done, or where it stands. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const row = await getRow(ctx, me._id);
    return {
      verified: !!me.ageVerified,
      status: row?.status ?? null,
      reason: row?.status === "rejected" ? (row.reason ?? null) : null,
    };
  },
});

/**
 * Sends the date of birth plus a government ID photo and a selfie holding it.
 * An under-18 date of birth locks the account out of the check (an admin can
 * clear it); no date is kept for it. Replaces an earlier declined submission.
 */
export const submit = mutation({
  args: {
    birthDate: v.string(),
    // Not needed for an under-18 date of birth
    idPhotoStorageId: v.optional(v.storageId()),
    selfieStorageId: v.optional(v.storageId()),
  },
  handler: async (ctx, { birthDate, idPhotoStorageId, selfieStorageId }) => {
    const me = await requireUser(ctx);
    const conflict = (message: string) =>
      new AppError({ code: "CONFLICT", message });
    if (me.ageVerified) throw conflict("Your age is already verified");
    const existing = await getRow(ctx, me._id);
    if (existing?.status === "pending")
      throw conflict("Your documents are already in review");
    if (existing?.status === "underage")
      throw new AppError({
        code: "FORBIDDEN",
        message: `You must be ${MIN_AGE} or older to use this site`,
      });

    const born = parseBirthDate(birthDate);
    if (!born) throw bad("Enter your date of birth");
    const now = new Date(ctx.now());

    // Under 18: record only the outcome, drop anything they uploaded
    if (!isAdult(born, now)) {
      ctx.storage.delete(idPhotoStorageId);
      ctx.storage.delete(selfieStorageId);
      // (delete ignores a missing id)
      const fields = {
        status: "underage" as const,
        birthDate: undefined,
        idStorageId: undefined,
        selfieStorageId: undefined,
        requestedAt: now.toISOString(),
        reviewedAt: now.toISOString(),
        reason: undefined,
      };
      if (existing) await ctx.db.patch("ageVerifications", existing._id, fields);
      else await ctx.db.insert("ageVerifications", { userId: me._id, ...fields });
      return { status: "underage" as const };
    }

    if (!idPhotoStorageId || !selfieStorageId)
      throw bad("Add both photos: your ID and a selfie holding it");
    if (idPhotoStorageId === selfieStorageId)
      throw bad("Send two different photos: your ID and a selfie holding it");
    await requireOwnImage(ctx, idPhotoStorageId, me._id);
    await requireOwnImage(ctx, selfieStorageId, me._id);

    const fields = {
      status: "pending" as const,
      birthDate: born,
      idStorageId: idPhotoStorageId,
      selfieStorageId,
      requestedAt: now.toISOString(),
      reviewedAt: undefined,
      reason: undefined,
    };
    if (existing) {
      // Normally already gone (deleted at review); clear any leftovers
      ctx.storage.delete(existing.idStorageId);
      ctx.storage.delete(existing.selfieStorageId);
      await ctx.db.patch("ageVerifications", existing._id, fields);
    } else {
      await ctx.db.insert("ageVerifications", { userId: me._id, ...fields });
    }
    return { status: "pending" as const };
  },
});

/** Admin queue, oldest first. Photo links (short-lived, signed) only go to admins. */
export const adminPending = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.paginate(
      "ageVerifications",
      {
        where: sql`status = 'pending'`,
        order: [{ column: "requested_at", cast: "timestamptz" }],
        direction: "asc",
      },
      paginationOpts,
    );
    const now = new Date(ctx.now());
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => {
          const user = await ctx.db.get("users", r.userId);
          return {
            _id: r._id,
            userId: r.userId,
            memberName: user ? publicSellerName(user) : "Deleted user",
            email: user?.email ?? null,
            accountType: user?.accountType ?? null,
            birthDate: r.birthDate ?? null,
            age: r.birthDate ? ageOn(r.birthDate, now) : null,
            requestedAt: r.requestedAt,
            idUrl: r.idStorageId ? await ctx.storage.getUrl(r.idStorageId) : null,
            selfieUrl: r.selfieStorageId
              ? await ctx.storage.getUrl(r.selfieStorageId)
              : null,
          };
        }),
      ),
    };
  },
});

/** Admin approves or declines. The photos are deleted either way. */
export const review = mutation({
  args: {
    verificationId: v.id("ageVerifications"),
    approve: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { verificationId, approve, reason }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("ageVerifications", verificationId);
    if (!row || row.status !== "pending") throw bad("Not a pending request");
    const note = reason?.trim();
    if (note && note.length > REASON_MAX) throw bad("Reason is too long");
    if (approve && (!row.birthDate || !isAdult(row.birthDate, new Date(ctx.now()))))
      throw bad("The date of birth shows they're under 18. Decline instead.");

    ctx.storage.delete(row.idStorageId);
    ctx.storage.delete(row.selfieStorageId);
    await ctx.db.patch("ageVerifications", verificationId, {
      status: approve ? "approved" : "rejected",
      idStorageId: undefined,
      selfieStorageId: undefined,
      reviewedAt: new Date(ctx.now()).toISOString(),
      reason: approve ? undefined : note || undefined,
    });
    if (approve) await ctx.db.patch("users", row.userId, { ageVerified: true });
    return null;
  },
});
