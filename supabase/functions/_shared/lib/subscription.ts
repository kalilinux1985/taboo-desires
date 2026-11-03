import { AppError } from "../core/errors.ts";
import type { QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { requireUser } from "./auth.ts";
import { isProActive, type PlanId } from "../domain/plans.ts";

export async function getSubscription(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Doc<"subscriptions"> | null> {
  return await ctx.db.first(
    "subscriptions",
    sql`where user_id = ${userId}::uuid`,
  );
}

export async function getPlan(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<PlanId> {
  return isProActive(await getSubscription(ctx, userId), ctx.now())
    ? "pro"
    : "free";
}

export async function requireAdmin(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin")
    throw new AppError({ code: "FORBIDDEN", message: "Admins only" });
  return user;
}
