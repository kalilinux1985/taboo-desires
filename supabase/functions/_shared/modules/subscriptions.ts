import { AppError } from "../core/errors.ts";
import { mutation, query } from "../core/functions.ts";
import { sql } from "../core/sql.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import { getSubscription, requireAdmin } from "../lib/subscription.ts";
import {
  isAllowedMonths,
  isProActive,
  nextExpiry,
  PLAN_LIMITS,
} from "../domain/plans.ts";
import { toCard } from "../lib/listingCard.ts";

const MAX_NOTE = 500;
const FEATURED_SELLERS = 8;

/** The signed-in seller's plan, limits, and Pro request state. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const sub = await getSubscription(ctx, me._id);
    const isPro = isProActive(sub, ctx.now());
    const plan = isPro ? "pro" : "free";
    return {
      plan,
      limits: PLAN_LIMITS[plan],
      status: sub?.status ?? null,
      expiresAt: isPro && sub ? sub.expiresAt : null,
      isAdmin: me.role === "admin",
    };
  },
});

export const requestPro = mutation({
  args: {
    note: v.string(),
    /** Plan length the seller picked (1, 3, 6 or 12 months) */
    months: v.optional(v.number()),
    /** The seller wants to pay some way other than the standard subscription */
    payAnotherWay: v.optional(v.boolean()),
  },
  handler: async (ctx, { note, months, payAnotherWay }) => {
    const user = await requireUser(ctx);
    if (user.accountType !== "seller")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Pro is for sellers. Become a seller first.",
      });
    if (note.length > MAX_NOTE)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Message is too long",
      });
    if (months !== undefined && !isAllowedMonths(months))
      throw new AppError({ code: "BAD_REQUEST", message: "Pick a valid plan" });
    const sub = await getSubscription(ctx, user._id);
    if (sub?.status === "pending")
      throw new AppError({
        code: "CONFLICT",
        message: "Your request is already being reviewed",
      });

    const fields = {
      status: "pending" as const,
      requestedAt: new Date(ctx.now()).toISOString(),
      note: note.trim() || undefined,
      requestedMonths: months ?? 1,
      payAnotherWay: !!payAnotherWay,
    };
    // An active seller can request a renewal; their current end date is kept until approved
    if (sub) await ctx.db.patch("subscriptions", sub._id, fields);
    else
      await ctx.db.insert("subscriptions", {
        userId: user._id,
        plan: "pro",
        expiresAt: "",
        ...fields,
      });
    return null;
  },
});

export const cancelRequest = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const sub = await getSubscription(ctx, user._id);
    if (!sub || sub.status !== "pending")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "No pending request",
      });
    // A renewal request on a still-valid plan falls back to active
    const status = isProActive(
      { status: "active", expiresAt: sub.expiresAt },
      ctx.now(),
    )
      ? "active"
      : "cancelled";
    await ctx.db.patch("subscriptions", sub._id, { status });
    return null;
  },
});

/** Admin queue. Pending sorts oldest first; active sorts by soonest expiry. */
export const adminList = query({
  args: {
    status: v.union(v.literal("pending"), v.literal("active")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { status, paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.paginate(
      "subscriptions",
      status === "pending"
        ? {
            where: sql`status = 'pending'`,
            order: [{ column: "requested_at", cast: "timestamptz" }],
            direction: "asc",
          }
        : {
            // expires_at is set on every approved row
            where: sql`status = 'active' and expires_at is not null`,
            order: [{ column: "expires_at", cast: "timestamptz" }],
            direction: "asc",
          },
      paginationOpts,
    );
    const now = ctx.now();
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (s) => {
          const user = await ctx.db.get("users", s.userId);
          return {
            _id: s._id,
            userId: s.userId,
            sellerName: user ? publicSellerName(user) : "Deleted user",
            email: user?.email ?? null,
            requestedAt: s.requestedAt,
            expiresAt: s.expiresAt || null,
            isCurrentlyPro: isProActive(
              { status: "active", expiresAt: s.expiresAt },
              now,
            ),
            note: s.note ?? null,
            requestedMonths: s.requestedMonths ?? null,
            payAnotherWay: !!s.payAnotherWay,
          };
        }),
      ),
    };
  },
});

export const approve = mutation({
  args: { subscriptionId: v.id("subscriptions"), months: v.number() },
  handler: async (ctx, { subscriptionId, months }) => {
    await requireAdmin(ctx);
    if (!isAllowedMonths(months))
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Pick a valid length",
      });
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub)
      throw new AppError({ code: "NOT_FOUND", message: "Request not found" });
    // Stack on any remaining paid time, regardless of the current request status
    const expiresAt = nextExpiry(
      { status: "active", expiresAt: sub.expiresAt },
      months,
      ctx.now(),
    );
    await ctx.db.patch("subscriptions", subscriptionId, {
      status: "active",
      expiresAt,
    });
    return { expiresAt };
  },
});

export const decline = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    await requireAdmin(ctx);
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub || sub.status !== "pending")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Not a pending request",
      });
    const stillPro = isProActive(
      { status: "active", expiresAt: sub.expiresAt },
      ctx.now(),
    );
    await ctx.db.patch("subscriptions", subscriptionId, {
      status: stillPro ? "active" : "declined",
    });
    return null;
  },
});

export const revoke = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    await requireAdmin(ctx);
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub) throw new AppError({ code: "NOT_FOUND", message: "Not found" });
    await ctx.db.patch("subscriptions", subscriptionId, {
      status: "cancelled",
      expiresAt: "",
    });
    return null;
  },
});

/** Home page spotlight: the newest active listing from each current Pro seller. */
export const featured = query({
  args: {},
  handler: async (ctx) => {
    const nowIso = new Date(ctx.now()).toISOString();
    ctx.db.touch("subscriptions");
    const listings = await ctx.db.docs(
      "listings",
      sql`
        select l.* from (
          select user_id, expires_at from public.subscriptions
           where status = 'active' and expires_at > ${nowIso}::timestamptz
           order by expires_at desc, id desc limit ${FEATURED_SELLERS}
        ) s
        cross join lateral (
          select * from public.listings
           where seller_id = s.user_id and status = 'active'
           order by created_at desc, id desc limit 1
        ) l
        order by s.expires_at desc`,
    );
    return await Promise.all(listings.map((l) => toCard(ctx, l)));
  },
});
