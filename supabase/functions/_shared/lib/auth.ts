import { AppError } from "../core/errors.ts";
import type { QueryCtx } from "../core/functions.ts";
import type { Doc } from "../core/schema.ts";
import { sql } from "../core/sql.ts";

/** Returns the signed-in user's row, or null if signed out / not synced yet. */
export async function getCurrentUserDoc(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db.first(
    "users",
    sql`where token_identifier = ${identity.tokenIdentifier}`,
  );
}

/** Throws unless a signed-in user with a synced row exists. */
export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Please sign in first",
    });
  }
  const user = await getCurrentUserDoc(ctx);
  if (!user) {
    throw new AppError({ code: "NOT_FOUND", message: "User not found" });
  }
  return user;
}

export function publicSellerName(user: Doc<"users">): string {
  return (
    user.shopName ||
    user.name ||
    (user.accountType === "buyer" ? "Anonymous buyer" : "Anonymous seller")
  );
}
