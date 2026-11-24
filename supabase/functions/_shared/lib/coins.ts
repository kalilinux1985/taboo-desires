// Moving Taboo Coins. Every change goes through here so the balance and the
// ledger always agree; the mutation's transaction makes each move all-or-nothing.

import { AppError } from "../core/errors.ts";
import type { QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";

type Kind = Doc<"coinLedger">["kind"];
type Link = { listingId?: Id<"listings">; orderId?: Id<"orders">; actorId?: Id<"users">; note?: string };

/** Adds (positive) or removes (negative) coins; refuses to go below zero. Returns the new balance. */
export async function moveCoins(ctx: QueryCtx, userId: Id<"users">, delta: number, kind: Kind, link: Link = {}): Promise<number> {
  if (!Number.isInteger(delta) || delta === 0) throw new AppError({ code: "BAD_REQUEST", message: "Invalid coin amount" });
  const rows = await ctx.db.rows(sql`
    update public.users set coin_balance = coin_balance + ${delta}::int
     where id = ${userId}::uuid and coin_balance + ${delta}::int >= 0
     returning coin_balance`);
  if (rows.length === 0)
    throw new AppError({ code: "BAD_REQUEST", message: delta < 0 ? "Not enough Taboo Coins" : "Account not found" });
  const balanceAfter = Number(rows[0].coin_balance);
  await ctx.db.insert("coinLedger", {
    userId,
    delta,
    balanceAfter,
    kind,
    ...(link.listingId ? { listingId: link.listingId } : {}),
    ...(link.orderId ? { orderId: link.orderId } : {}),
    ...(link.actorId ? { actorId: link.actorId } : {}),
    ...(link.note ? { note: link.note.slice(0, 200) } : {}),
  });
  return balanceAfter;
}

/** Buyer pays a seller: both sides in one go. */
export async function payCoins(
  ctx: QueryCtx,
  buyerId: Id<"users">,
  sellerId: Id<"users">,
  amount: number,
  kinds: { buyer: Kind; seller: Kind },
  link: Link,
) {
  await moveCoins(ctx, buyerId, -amount, kinds.buyer, link);
  await moveCoins(ctx, sellerId, amount, kinds.seller, link);
}
