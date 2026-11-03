import { AppError } from "../core/errors.ts";
import { mutation, query } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import { categoryValidator, conditionValidator } from "./listings.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import type { Party } from "../domain/enums.ts";
import { requireCapability } from "../lib/access.ts";

export type CustomAction = "accept" | "decline" | "counter" | "cancel";

export const MIN_PRICE_CENTS = 1_00;
export const MAX_PRICE_CENTS = 10_000_00;
export const MAX_DETAILS = 1000;
export const MAX_NOTE = 300;
// Stops one buyer from flooding a seller with open requests
export const MAX_OPEN_PER_SELLER = 3;

/** Which side of the request the user is on, or null if they aren't part of it. */
export function partyOf(
  req: Pick<Doc<"customRequests">, "buyerId" | "sellerId">,
  userId: Id<"users">,
): Party | null {
  if (req.buyerId === userId) return "buyer";
  if (req.sellerId === userId) return "seller";
  return null;
}

/**
 * Turn rules: the side that did NOT make the latest offer may accept, decline or counter.
 * The buyer may cancel a pending request at any time.
 */
export function assertCanAct(
  req: Pick<Doc<"customRequests">, "status" | "offeredBy">,
  party: Party,
  action: CustomAction,
) {
  if (req.status !== "pending") {
    throw new AppError({
      code: "CONFLICT",
      message: "This request is already closed",
    });
  }
  if (action === "cancel") {
    if (party !== "buyer")
      throw new AppError({
        code: "FORBIDDEN",
        message: "Only the buyer can cancel",
      });
    return;
  }
  if (req.offeredBy === party) {
    throw new AppError({
      code: "BAD_REQUEST",
      message: "Waiting for the other side to respond",
    });
  }
}

export function assertPrice(cents: number) {
  if (
    !Number.isInteger(cents) ||
    cents < MIN_PRICE_CENTS ||
    cents > MAX_PRICE_CENTS
  ) {
    throw new AppError({
      code: "BAD_REQUEST",
      message: "Enter a price between $1 and $10,000",
    });
  }
}

const partyValidator = v.union(v.literal("buyer"), v.literal("seller"));

/** Buyer sends a custom order request to a seller. */
export const create = mutation({
  args: {
    sellerId: v.id("users"),
    category: categoryValidator,
    wearTime: conditionValidator,
    size: v.string(),
    details: v.string(),
    budgetCents: v.number(),
  },
  handler: async (ctx, args) => {
    const me = await requireCapability(ctx, "buy");
    if (me._id === args.sellerId) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "You can't send a request to yourself",
      });
    }
    const seller = await ctx.db.get("users", args.sellerId);
    if (!seller || (seller.accountType !== "seller" && seller.role !== "admin")) {
      throw new AppError({ code: "NOT_FOUND", message: "Seller not found" });
    }
    const size = args.size.trim();
    const details = args.details.trim();
    if (!size || size.length > 20)
      throw new AppError({ code: "BAD_REQUEST", message: "Enter a size" });
    if (details.length < 10 || details.length > MAX_DETAILS) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Describe your request in 10 to 1000 characters",
      });
    }
    assertPrice(args.budgetCents);

    const open = Number(
      await ctx.db.scalar(sql`
        select count(*)::int from public.custom_requests
         where buyer_id = ${me._id}::uuid and seller_id = ${args.sellerId}::uuid and status = 'pending'`),
    );
    if (open >= MAX_OPEN_PER_SELLER) {
      throw new AppError({
        code: "CONFLICT",
        message: `You already have ${MAX_OPEN_PER_SELLER} open requests with this seller`,
      });
    }

    return await ctx.db.insert("customRequests", {
      buyerId: me._id,
      sellerId: args.sellerId,
      category: args.category,
      wearTime: args.wearTime,
      size,
      details,
      budgetCents: args.budgetCents,
      offerCents: args.budgetCents,
      offeredBy: "buyer",
      status: "pending",
      updatedAt: new Date(ctx.now()).toISOString(),
    });
  },
});

/** Accept, decline, counter-offer, or (buyer only) cancel. */
export const respond = mutation({
  args: {
    requestId: v.id("customRequests"),
    action: v.union(
      v.literal("accept"),
      v.literal("decline"),
      v.literal("counter"),
      v.literal("cancel"),
    ),
    offerCents: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, action, offerCents, note }) => {
    const me = await requireUser(ctx);
    const req = await ctx.db.get("customRequests", requestId);
    const party = req ? partyOf(req, me._id) : null;
    if (!req || !party)
      throw new AppError({ code: "NOT_FOUND", message: "Request not found" });
    assertCanAct(req, party, action);

    const updatedAt = new Date(ctx.now()).toISOString();
    if (action === "counter") {
      if (offerCents === undefined)
        throw new AppError({
          code: "BAD_REQUEST",
          message: "Enter your price",
        });
      assertPrice(offerCents);
      const trimmed = note?.trim() ?? "";
      if (trimmed.length > MAX_NOTE) {
        throw new AppError({
          code: "BAD_REQUEST",
          message: "Keep your note under 300 characters",
        });
      }
      await ctx.db.patch("customRequests", requestId, {
        offerCents,
        offeredBy: party,
        note: trimmed || undefined,
        updatedAt,
      });
      return null;
    }
    const status =
      action === "accept"
        ? "accepted"
        : action === "decline"
          ? "declined"
          : "cancelled";
    await ctx.db.patch("customRequests", requestId, { status, updatedAt });
    return null;
  },
});

/** Requests I've sent (as buyer) or received (as seller), most recently updated first. */
export const list = query({
  args: { role: partyValidator, paginationOpts: paginationOptsValidator },
  handler: async (ctx, { role, paginationOpts }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db.paginate(
      "customRequests",
      {
        where:
          role === "buyer"
            ? sql`buyer_id = ${me._id}::uuid`
            : sql`seller_id = ${me._id}::uuid`,
        order: [{ column: "updated_at", cast: "timestamptz" }],
        direction: "desc",
      },
      paginationOpts,
    );

    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => {
          const other = await ctx.db.get(
            "users",
            role === "buyer" ? r.sellerId : r.buyerId,
          );
          return {
            _id: r._id,
            category: r.category,
            wearTime: r.wearTime,
            size: r.size,
            details: r.details,
            budgetCents: r.budgetCents,
            offerCents: r.offerCents,
            note: r.note ?? null,
            status: r.status,
            updatedAt: r.updatedAt,
            createdAt: r._creationTime,
            myTurn: r.status === "pending" && r.offeredBy !== role,
            lastOfferByMe: r.offeredBy === role,
            other: other
              ? {
                  _id: other._id,
                  name: publicSellerName(other),
                  avatarUrl: other.avatarStorageId
                    ? await ctx.storage.getUrl(other.avatarStorageId)
                    : null,
                }
              : null,
          };
        }),
      ),
    };
  },
});
