import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import { isOwnFile } from "../core/storage.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import { requireAdmin } from "../lib/subscription.ts";

const REASON_MAX = 300;

async function getVerification(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db.first(
    "verifications",
    sql`where user_id = ${userId}::uuid`,
  );
}

/** The signed-in seller's verification state. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const row = await getVerification(ctx, me._id);
    return {
      verified: !!me.verified,
      status: row?.status ?? null,
      reason: row?.status === "rejected" ? (row.reason ?? null) : null,
    };
  },
});

/** Seller sends a private photo for an admin to check. Replaces any earlier submission. */
export const submit = mutation({
  args: { photoStorageId: v.storageId() },
  handler: async (ctx, { photoStorageId }) => {
    const me = await requireUser(ctx);
    if (!isOwnFile(photoStorageId, me._id, "private"))
      throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
    const reject = (
      message: string,
      code: "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT" = "BAD_REQUEST",
    ) => new AppError({ code, message });
    if (me.accountType !== "seller" && me.role !== "admin")
      throw reject("Only seller accounts can get verified", "FORBIDDEN");
    if (me.verified) throw reject("You're already verified", "CONFLICT");
    const contentType = await ctx.storage.getContentType(photoStorageId);
    if (contentType === undefined)
      throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
    if (contentType && !contentType.startsWith("image/"))
      throw reject("Please upload a photo");

    const existing = await getVerification(ctx, me._id);
    const fields = {
      status: "pending" as const,
      photoStorageId,
      requestedAt: new Date(ctx.now()).toISOString(),
      reviewedAt: undefined,
      reason: undefined,
    };
    if (existing) {
      ctx.storage.delete(existing.photoStorageId);
      await ctx.db.patch("verifications", existing._id, fields);
    } else {
      await ctx.db.insert("verifications", { userId: me._id, ...fields });
    }
    return null;
  },
});

/** Admin queue, oldest first. Photo URLs (short-lived, signed) only go to admins. */
export const adminPending = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.paginate(
      "verifications",
      {
        where: sql`status = 'pending'`,
        order: [{ column: "requested_at", cast: "timestamptz" }],
        direction: "asc",
      },
      paginationOpts,
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => {
          const user = await ctx.db.get("users", r.userId);
          return {
            _id: r._id,
            userId: r.userId,
            sellerName: user ? publicSellerName(user) : "Deleted user",
            email: user?.email ?? null,
            requestedAt: r.requestedAt,
            photoUrl: r.photoStorageId
              ? await ctx.storage.getUrl(r.photoStorageId)
              : null,
          };
        }),
      ),
    };
  },
});

export const review = mutation({
  args: {
    verificationId: v.id("verifications"),
    approve: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { verificationId, approve, reason }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("verifications", verificationId);
    if (!row || row.status !== "pending")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Not a pending request",
      });
    const note = reason?.trim();
    if (note && note.length > REASON_MAX)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Reason is too long",
      });
    // The photo was only needed for the check
    ctx.storage.delete(row.photoStorageId);
    await ctx.db.patch("verifications", verificationId, {
      status: approve ? "approved" : "rejected",
      photoStorageId: undefined,
      reviewedAt: new Date(ctx.now()).toISOString(),
      reason: approve ? undefined : note || undefined,
    });
    await ctx.db.patch("users", row.userId, { verified: approve });
    return null;
  },
});

/** Admin can take the badge away later. */
export const revoke = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("users", userId, { verified: false });
    const row = await getVerification(ctx, userId);
    if (row)
      await ctx.db.patch("verifications", row._id, {
        status: "rejected",
        reason: "Badge removed by an admin",
      });
    return null;
  },
});
