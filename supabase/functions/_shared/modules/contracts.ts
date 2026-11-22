// Contracts: the seller fills in the item, the price, how many payments and
// when each is due, and sends it into the conversation. The buyer accepts
// (which creates an order), rejects, or comments. Both can comment.

import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import { publicSellerName, requireUser } from "../lib/auth.ts";
import { queueEmail, siteUrl } from "../lib/email.ts";
import { bumpStats } from "../lib/sellerStats.ts";
import { appendMessage, requireParticipant } from "./messages.ts";
import { createOrder } from "./orders.ts";

const MAX_PAYMENTS = 24;
const bad = (message: string) => new AppError({ code: "BAD_REQUEST", message });
const nowIso = (ctx: { now(): number }) => new Date(ctx.now()).toISOString();
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function cleanText(text: string | undefined, max: number, label: string): string | undefined {
  const t = (text ?? "").trim();
  if (!t) return undefined;
  if (t.length > max) throw bad(`${label} is too long`);
  return t;
}

/** Loads a contract and checks the caller is its buyer or seller. */
async function requireParty(ctx: QueryCtx, contractId: Id<"contracts">) {
  const contract = await ctx.db.get("contracts", contractId);
  if (!contract) throw new AppError({ code: "NOT_FOUND", message: "Contract not found" });
  const { user, convo } = await requireParticipant(ctx, contract.conversationId);
  return { contract, me: user, convo, isBuyer: user._id === contract.buyerId };
}

export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    listingId: v.optional(v.id("listings")),
    itemTitle: v.string(),
    itemUrl: v.optional(v.string()),
    totalCents: v.number(),
    paymentMethod: v.optional(v.string()),
    schedule: v.array(v.object({ dueDate: v.string(), amountCents: v.number() }), MAX_PAYMENTS),
    terms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, convo } = await requireParticipant(ctx, args.conversationId);
    if (convo.sellerId !== user._id) throw new AppError({ code: "FORBIDDEN", message: "Only the seller can send a contract" });

    // What is being sold: one of the seller's listings, or a link to the item or service
    let itemUrl = cleanText(args.itemUrl, 500, "The link");
    if (args.listingId) {
      const listing = await ctx.db.get("listings", args.listingId);
      if (!listing || listing.sellerId !== user._id) throw bad("Pick one of your own listings");
      itemUrl = undefined;
    } else {
      if (!itemUrl) throw bad("Pick a listing or add a link to the item or service");
      if (!/^https?:\/\/\S+$/i.test(itemUrl)) throw bad("The link must start with http:// or https://");
    }
    const itemTitle = cleanText(args.itemTitle, 120, "The item name");
    if (!itemTitle) throw bad("Name the item or service");

    // Money: whole cents, payments add up to the total, due dates in order and not in the past
    const total = Math.round(args.totalCents);
    if (!Number.isFinite(total) || total < 100) throw bad("The total must be at least $1.00");
    if (total > 10_000_000) throw bad("The total is too large");
    if (args.schedule.length < 1) throw bad("Add at least one payment");
    const today = new Date(ctx.now()).toISOString().slice(0, 10);
    let prev = "";
    let sum = 0;
    const schedule = args.schedule.map((p, i) => {
      const amount = Math.round(p.amountCents);
      if (!Number.isFinite(amount) || amount <= 0) throw bad(`Payment ${i + 1} needs an amount`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.dueDate) || Number.isNaN(Date.parse(p.dueDate))) throw bad(`Payment ${i + 1} needs a due date`);
      if (p.dueDate < today) throw bad(`Payment ${i + 1} is due in the past`);
      if (prev && p.dueDate < prev) throw bad("Put the payments in date order");
      prev = p.dueDate;
      sum += amount;
      return { dueDate: p.dueDate, amountCents: amount };
    });
    if (sum !== total) throw bad(`The payments add up to ${money(sum)}, not the total of ${money(total)}`);

    const contractId = await ctx.db.insert("contracts", {
      conversationId: convo._id,
      sellerId: convo.sellerId,
      buyerId: convo.buyerId,
      listingId: args.listingId,
      itemTitle,
      itemUrl,
      totalCents: total,
      paymentCount: schedule.length,
      paymentMethod: cleanText(args.paymentMethod, 80, "The payment method"),
      schedule,
      terms: cleanText(args.terms, 2000, "The terms"),
      status: "pending",
      updatedAt: nowIso(ctx),
    });
    await appendMessage(
      ctx,
      convo,
      user._id,
      `Sent a contract: ${itemTitle} · ${money(total)} in ${schedule.length} ${schedule.length === 1 ? "payment" : "payments"}`,
      contractId,
    );
    return contractId;
  },
});

/** A contract with its comments, for the card in Messages. */
export const get = query({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, { contractId }) => {
    ctx.db.touch("contracts", "contractComments");
    const { contract: c, me, isBuyer } = await requireParty(ctx, contractId);
    const [listing, comments] = await Promise.all([
      c.listingId ? ctx.db.get("listings", c.listingId) : null,
      ctx.db.select("contractComments", sql`where contract_id = ${contractId}::uuid order by created_at, id limit 200`),
    ]);
    const authors = new Map<string, Doc<"users"> | null>();
    await Promise.all(
      [...new Set(comments.map((m) => m.authorId))].map(async (id) => authors.set(id, await ctx.db.get("users", id))),
    );
    return {
      ...view(c, listing),
      role: isBuyer ? ("buyer" as const) : ("seller" as const),
      comments: comments.map((m) => {
        const a = authors.get(m.authorId);
        return {
          _id: m._id,
          _creationTime: m._creationTime,
          body: m.body,
          mine: m.authorId === me._id,
          authorName: a ? publicSellerName(a) : "Deleted user",
        };
      }),
    };
  },
});

/** The public fields of a contract (also shown on the order). */
export function view(c: Doc<"contracts">, listing: Doc<"listings"> | null) {
  return {
    _id: c._id,
    _creationTime: c._creationTime,
    itemTitle: c.itemTitle,
    listingId: listing ? listing._id : null,
    listingTitle: listing?.title ?? null,
    itemUrl: listing ? `${siteUrl()}/listing/${listing._id}` : (c.itemUrl ?? null),
    totalCents: c.totalCents,
    paymentCount: c.paymentCount,
    paymentMethod: c.paymentMethod ?? null,
    schedule: c.schedule,
    terms: c.terms ?? null,
    status: c.status,
    respondedAt: c.respondedAt ?? null,
    orderId: c.orderId ?? null,
  };
}

export type ContractView = ReturnType<typeof view>;

/** The buyer accepts (an order is created for the seller) or rejects. */
export const respond = mutation({
  args: { contractId: v.id("contracts"), accept: v.boolean() },
  handler: async (ctx, { contractId, accept }) => {
    const { contract: c, me, convo, isBuyer } = await requireParty(ctx, contractId);
    if (!isBuyer) throw new AppError({ code: "FORBIDDEN", message: "Only the buyer can accept or reject" });
    if (c.status !== "pending") throw new AppError({ code: "CONFLICT", message: `This contract was already ${c.status}` });
    const now = nowIso(ctx);
    let orderId: Id<"orders"> | undefined;
    if (accept) {
      orderId = await createOrder(ctx, {
        sellerId: c.sellerId,
        buyerId: c.buyerId,
        title: c.itemTitle,
        ...(c.listingId ? { listingId: c.listingId } : {}),
      });
      await ctx.db.patch("orders", orderId, { contractId: c._id });
      await bumpStats(ctx, c.sellerId, { salesCount: 1 });
    }
    await ctx.db.patch("contracts", c._id, {
      status: accept ? "accepted" : "rejected",
      respondedAt: now,
      updatedAt: now,
      ...(orderId ? { orderId } : {}),
    });
    await appendMessage(ctx, convo, me._id, `${accept ? "Accepted" : "Rejected"} the contract: ${c.itemTitle}`, c._id);
    const seller = await ctx.db.get("users", c.sellerId);
    if (seller)
      await queueEmail(ctx, {
        to: seller,
        kind: "contract_answered",
        transactional: true,
        subject: `${publicSellerName(me)} ${accept ? "accepted" : "rejected"} your contract`,
        heading: accept ? "Contract accepted" : "Contract rejected",
        lines: [
          `${publicSellerName(me)} ${accept ? "accepted" : "rejected"} your contract for "${c.itemTitle}" (${money(c.totalCents)}).`,
          ...(accept ? ["It's now in your Orders, ready for you to ship."] : []),
        ],
        button: accept ? { label: "View order", path: "/orders" } : { label: "Open messages", path: `/messages/${c.conversationId}` },
        dedupeKey: `contract_answered:${c._id}`,
      });
    return orderId ?? null;
  },
});

/** The seller takes back a contract the buyer hasn't answered yet. */
export const cancel = mutation({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, { contractId }) => {
    const { contract: c, me, convo, isBuyer } = await requireParty(ctx, contractId);
    if (isBuyer) throw new AppError({ code: "FORBIDDEN", message: "Only the seller can withdraw a contract" });
    if (c.status !== "pending") throw new AppError({ code: "CONFLICT", message: `This contract was already ${c.status}` });
    const now = nowIso(ctx);
    await ctx.db.patch("contracts", c._id, { status: "cancelled", respondedAt: now, updatedAt: now });
    await appendMessage(ctx, convo, me._id, `Withdrew the contract: ${c.itemTitle}`, c._id);
    return null;
  },
});

/** Either side adds a comment to the contract. */
export const comment = mutation({
  args: { contractId: v.id("contracts"), body: v.string() },
  handler: async (ctx, { contractId, body }) => {
    const { contract: c, me, convo } = await requireParty(ctx, contractId);
    const text = cleanText(body, 1000, "The comment");
    if (!text) throw bad("Write a comment");
    await ctx.db.insert("contractComments", { contractId: c._id, authorId: me._id, body: text });
    await ctx.db.patch("contracts", c._id, { updatedAt: nowIso(ctx) });
    await appendMessage(ctx, convo, me._id, `Commented on the contract: ${text}`.slice(0, 2000));
    return null;
  },
});

/** The seller's own active listings, to attach to a contract. */
export const myListings = query({
  args: {},
  handler: async (ctx) => {
    ctx.db.touch("listings");
    const me = await requireUser(ctx);
    const rows = await ctx.db.select(
      "listings",
      sql`where seller_id = ${me._id}::uuid and status = 'active' order by created_at desc limit 100`,
    );
    return rows.map((l) => ({ _id: l._id, title: l.title, priceCents: l.priceCents }));
  },
});
