// Orders: one physical item a seller owes a buyer, from sale to delivery.
// Labels and tracking are in shipping.ts; this file holds the order itself,
// addresses, and the seller's "sold to" step.

import { AppError } from "../core/errors.ts";
import {
  action,
  internalMutation,
  mutation,
  query,
  type QueryCtx,
} from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import {
  carrierTrackingUrl,
  CARRIERS,
  cityLine,
  cleanAddress,
  type ShippingAddress,
} from "../domain/shipping.ts";
import { requireCapability } from "../lib/access.ts";
import { getCurrentUserDoc, publicSellerName, requireUser } from "../lib/auth.ts";
import { shippingError, verifyAddress } from "../lib/easypost.ts";
import { bumpStats } from "../lib/sellerStats.ts";

export const addressValidator = v.object({
  name: v.string(),
  street1: v.string(),
  street2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  zip: v.string(),
  phone: v.optional(v.string()),
});

/** A cleaned, verified address as stored (internal calls only). */
export const storedAddressValidator = v.object({
  name: v.string(),
  street1: v.string(),
  street2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  zip: v.string(),
  country: v.literal("US"),
  phone: v.optional(v.string()),
});

const roleValidator = v.union(v.literal("buyer"), v.literal("seller"));
const kindValidator = v.union(v.literal("ship_to"), v.literal("ship_from"));

/** Category names for order titles (the UI has its own copy in lib/listings). */
export const CATEGORY_LABEL_SERVER: Record<string, string> = {
  panties: "Panties",
  bras: "Bra",
  lingerie: "Lingerie",
  socks: "Socks",
  shoes: "Shoes",
  activewear: "Activewear",
  clothing: "Clothing",
  extras: "Extras",
  custom: "Custom item",
};

const nowIso = (ctx: { now(): number }) => new Date(ctx.now()).toISOString();

/** Statuses where nothing has been bought or shipped yet. */
const OPEN = new Set<Doc<"orders">["status"]>(["awaiting_address", "ready_to_ship"]);

// ---------------------------------------------------------------------------
// Helpers shared with shipping.ts
// ---------------------------------------------------------------------------

/**
 * Loads an order the signed-in user is the buyer or seller of. `pro` also
 * requires an active Pro plan (buying labels); reading or printing a label
 * that was already bought doesn't.
 */
export async function getOrderAs(
  ctx: QueryCtx,
  orderId: Id<"orders">,
  role: "buyer" | "seller",
  opts: { pro?: boolean } = {},
): Promise<{ order: Doc<"orders">; me: Doc<"users"> }> {
  const me =
    role === "seller" && opts.pro
      ? await requireCapability(ctx, "list")
      : await requireUser(ctx);
  const order = await ctx.db.get("orders", orderId);
  const mine = order && (role === "seller" ? order.sellerId : order.buyerId) === me._id;
  if (!order || !mine)
    throw new AppError({ code: "NOT_FOUND", message: "Order not found" });
  return { order, me };
}

export async function getSavedAddress(
  ctx: QueryCtx,
  userId: Id<"users">,
  kind: "ship_to" | "ship_from",
): Promise<ShippingAddress | null> {
  const row = await ctx.db.first(
    "shippingAddresses",
    sql`where user_id = ${userId}::uuid and kind = ${kind}`,
  );
  return row?.address ?? null;
}

async function saveAddressRow(
  ctx: QueryCtx,
  userId: Id<"users">,
  kind: "ship_to" | "ship_from",
  address: ShippingAddress,
) {
  const existing = await ctx.db.first(
    "shippingAddresses",
    sql`where user_id = ${userId}::uuid and kind = ${kind}`,
  );
  if (existing)
    await ctx.db.patch("shippingAddresses", existing._id, { address, updatedAt: nowIso(ctx) });
  else
    await ctx.db.insert("shippingAddresses", { userId, kind, address, updatedAt: nowIso(ctx) });
}

/** Creates an order, pre-filled with the buyer's saved address when they have one. */
export async function createOrder(
  ctx: QueryCtx,
  fields: {
    sellerId: Id<"users">;
    buyerId: Id<"users">;
    title: string;
    listingId?: Id<"listings">;
    customRequestId?: Id<"customRequests">;
  },
): Promise<Id<"orders">> {
  const shipTo = await getSavedAddress(ctx, fields.buyerId, "ship_to");
  return await ctx.db.insert("orders", {
    ...fields,
    title: fields.title.slice(0, 120) || "Order",
    status: shipTo ? "ready_to_ship" : "awaiting_address",
    shipTo: shipTo ?? undefined,
    updatedAt: nowIso(ctx),
  });
}

/** The live (not cancelled) order for a listing, if any. */
export async function liveOrderForListing(ctx: QueryCtx, listingId: Id<"listings">) {
  return await ctx.db.first(
    "orders",
    sql`where listing_id = ${listingId}::uuid and status <> 'cancelled'`,
  );
}

async function toView(ctx: QueryCtx, o: Doc<"orders">, role: "buyer" | "seller") {
  const [other, listing] = await Promise.all([
    ctx.db.get("users", role === "buyer" ? o.sellerId : o.buyerId),
    o.listingId ? ctx.db.get("listings", o.listingId) : null,
  ]);
  const imageId = listing?.imageIds[0];
  return {
    _id: o._id,
    role,
    title: o.title,
    status: o.status,
    createdAt: o._creationTime,
    updatedAt: o.updatedAt,
    listingId: o.listingId ?? null,
    customRequestId: o.customRequestId ?? null,
    imageUrl: imageId ? await ctx.storage.getUrl(imageId) : null,
    other: other
      ? {
          _id: other._id,
          name:
            role === "buyer"
              ? publicSellerName(other)
              : other.name || "Anonymous buyer",
          avatarUrl: other.avatarStorageId
            ? await ctx.storage.getUrl(other.avatarStorageId)
            : null,
        }
      : null,
    /** Full address only for the buyer; the seller sees it on the label */
    shipTo: role === "buyer" ? (o.shipTo ?? null) : null,
    shipsTo: cityLine(o.shipTo),
    carrier: o.carrier ?? null,
    service: o.service ?? null,
    postageCents: role === "seller" ? (o.postageCents ?? null) : null,
    trackingCode: o.trackingCode ?? null,
    trackingUrl: o.trackingUrl ?? null,
    trackingStatus: o.trackingStatus ?? null,
    hasLabel: !!o.labelUrl,
    labelUrl: role === "seller" ? (o.labelUrl ?? null) : null,
    labelCreatedAt: o.labelCreatedAt ?? null,
    shippedAt: o.shippedAt ?? null,
    deliveredAt: o.deliveredAt ?? null,
  };
}

export type OrderView = Awaited<ReturnType<typeof toView>>;

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** My purchases (role "buyer") or sales (role "seller"), most recently updated first. */
export const list = query({
  args: { role: roleValidator, paginationOpts: paginationOptsValidator },
  handler: async (ctx, { role, paginationOpts }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db.paginate(
      "orders",
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
      page: await Promise.all(result.page.map((o) => toView(ctx, o, role))),
    };
  },
});

/** How many orders need my attention (buyer: add address; seller: ship). */
export const actionCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return 0;
    ctx.db.touch("orders");
    return Number(
      await ctx.db.scalar(sql`
        select count(*)::int from public.orders
         where (buyer_id = ${me._id}::uuid and status = 'awaiting_address')
            or (seller_id = ${me._id}::uuid and status in ('ready_to_ship', 'label_created'))`),
    );
  },
});

/** The order for one of my listings, if it was sold through the site. */
export const forListing = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await getCurrentUserDoc(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!me || !listing || listing.sellerId !== me._id) return null;
    const order = await liveOrderForListing(ctx, listingId);
    return order ? await toView(ctx, order, "seller") : null;
  },
});

/**
 * Buyers the seller can mark a listing as sold to: people who have messaged
 * them, those who asked about this listing first.
 */
export const buyerChoices = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await getCurrentUserDoc(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!me || !listing || listing.sellerId !== me._id) return [];
    ctx.db.touch("conversations", "users");
    const rows = await ctx.db.rows(sql`
      select u.id, u.name, u.avatar_storage_id,
             bool_or(c.listing_id = ${listingId}::uuid) as asked_about_it,
             max(c.last_message_at) as last_at
        from public.conversations c
        join public.users u on u.id = c.buyer_id
       where c.seller_id = ${me._id}::uuid
       group by u.id
       order by bool_or(c.listing_id = ${listingId}::uuid) desc, max(c.last_message_at) desc
       limit 30`);
    return await Promise.all(
      rows.map(async (r) => ({
        _id: String(r.id) as Id<"users">,
        name: (r.name as string | null) || "Anonymous buyer",
        avatarUrl: r.avatar_storage_id
          ? await ctx.storage.getUrl(r.avatar_storage_id as string)
          : null,
        askedAboutIt: r.asked_about_it === true || r.asked_about_it === "t",
      })),
    );
  },
});

/** My saved addresses: default ship-to (buyers) and return address (sellers). */
export const myAddresses = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return { shipTo: null, shipFrom: null };
    const [shipTo, shipFrom] = await Promise.all([
      getSavedAddress(ctx, me._id, "ship_to"),
      getSavedAddress(ctx, me._id, "ship_from"),
    ]);
    return { shipTo, shipFrom };
  },
});

// ---------------------------------------------------------------------------
// Selling
// ---------------------------------------------------------------------------

/**
 * Seller marks a fixed-price listing as sold. With a buyer, an order is
 * created so the buyer can add their address and the seller can ship with a
 * label. Without one (sold off-site), the listing is just marked sold.
 */
export const sellListing = mutation({
  args: { listingId: v.id("listings"), buyerId: v.optional(v.id("users")) },
  handler: async (ctx, { listingId, buyerId }) => {
    const me = await requireUser(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!listing) throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
    if (listing.sellerId !== me._id)
      throw new AppError({ code: "FORBIDDEN", message: "Not your listing" });
    if (listing.saleType === "auction")
      throw new AppError({ code: "BAD_REQUEST", message: "Auctions close automatically" });
    if (listing.status !== "active")
      throw new AppError({ code: "CONFLICT", message: "This listing is already sold" });

    let orderId: Id<"orders"> | null = null;
    if (buyerId) {
      const talked = await ctx.db.scalar(sql`
        select 1 from public.conversations
         where seller_id = ${me._id}::uuid and buyer_id = ${buyerId}::uuid limit 1`);
      if (!talked)
        throw new AppError({
          code: "BAD_REQUEST",
          message: "You can only sell to a buyer who has messaged you",
        });
      orderId = await createOrder(ctx, {
        sellerId: me._id,
        buyerId,
        listingId,
        title: listing.title,
      });
    }
    await ctx.db.patch("listings", listingId, { status: "sold" });
    await bumpStats(ctx, me._id, { salesCount: 1 });
    return orderId;
  },
});

/** Either side cancels before a label is bought or anything is shipped. */
export const cancel = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const me = await requireUser(ctx);
    const order = await ctx.db.get("orders", orderId);
    if (!order || (order.buyerId !== me._id && order.sellerId !== me._id))
      throw new AppError({ code: "NOT_FOUND", message: "Order not found" });
    if (!OPEN.has(order.status))
      throw new AppError({
        code: "CONFLICT",
        message:
          order.status === "label_created"
            ? "Void the shipping label first"
            : "This order can't be cancelled anymore",
      });
    await ctx.db.patch("orders", orderId, { status: "cancelled", updatedAt: nowIso(ctx) });
    return null;
  },
});

/** Seller shipped it on their own and types in the tracking number. */
export const addTracking = mutation({
  args: {
    orderId: v.id("orders"),
    carrier: v.string(),
    trackingCode: v.string(),
  },
  handler: async (ctx, { orderId, carrier, trackingCode }) => {
    const { order } = await getOrderAs(ctx, orderId, "seller");
    if (order.status !== "ready_to_ship" && order.status !== "awaiting_address")
      throw new AppError({ code: "CONFLICT", message: "This order already has tracking" });
    const code = trackingCode.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z0-9]{8,40}$/.test(code))
      throw new AppError({ code: "BAD_REQUEST", message: "Enter a valid tracking number" });
    if (!(CARRIERS as readonly string[]).includes(carrier))
      throw new AppError({ code: "BAD_REQUEST", message: "Pick a carrier" });
    const now = nowIso(ctx);
    await ctx.db.patch("orders", orderId, {
      status: "shipped",
      carrier,
      trackingCode: code,
      trackingUrl: carrierTrackingUrl(carrier, code) ?? undefined,
      shippedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

/** Buyer confirms the package arrived (for tracking the site can't follow). */
export const confirmReceived = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const { order } = await getOrderAs(ctx, orderId, "buyer");
    if (order.status !== "shipped" && order.status !== "label_created")
      throw new AppError({ code: "CONFLICT", message: "This order hasn't shipped yet" });
    const now = nowIso(ctx);
    await ctx.db.patch("orders", orderId, {
      status: "delivered",
      deliveredAt: now,
      updatedAt: now,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Addresses (verified with EasyPost before they're saved)
// ---------------------------------------------------------------------------

function clean(raw: Parameters<typeof cleanAddress>[0]): ShippingAddress {
  const result = cleanAddress(raw);
  if (!result.ok) throw new AppError({ code: "BAD_REQUEST", message: result.message });
  return result.address;
}

async function verified(raw: Parameters<typeof cleanAddress>[0]): Promise<ShippingAddress> {
  try {
    return await verifyAddress(clean(raw));
  } catch (e) {
    throw shippingError(e, "Couldn't check that address");
  }
}

export const _whoAmI = internalMutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    return { _id: me._id, accountType: me.accountType ?? null, role: me.role ?? null };
  },
});

export const _setShipTo = internalMutation({
  args: {
    orderId: v.id("orders"),
    address: storedAddressValidator,
    saveAsDefault: v.boolean(),
  },
  handler: async (ctx, { orderId, address, saveAsDefault }) => {
    const { order, me } = await getOrderAs(ctx, orderId, "buyer");
    if (!OPEN.has(order.status))
      throw new AppError({
        code: "CONFLICT",
        message: "The label is already made, so the address can't change. Message the seller.",
      });
    await ctx.db.patch("orders", orderId, {
      shipTo: address,
      status: "ready_to_ship",
      // A new address makes any rates the seller fetched stale
      easypostShipmentId: undefined,
      updatedAt: nowIso(ctx),
    });
    if (saveAsDefault) await saveAddressRow(ctx, me._id, "ship_to", address);
    return null;
  },
});

/** Buyer sets where this order ships. */
export const setShipTo = action({
  args: {
    orderId: v.id("orders"),
    address: addressValidator,
    saveAsDefault: v.boolean(),
  },
  handler: async (ctx, { orderId, address, saveAsDefault }) => {
    await ctx.runMutation(_whoAmI, {});
    const checked = await verified(address);
    await ctx.runMutation(_setShipTo, { orderId, address: checked, saveAsDefault });
    return checked;
  },
});

export const _saveAddress = internalMutation({
  args: { kind: kindValidator, address: storedAddressValidator },
  handler: async (ctx, { kind, address }) => {
    const me = await requireUser(ctx);
    await saveAddressRow(ctx, me._id, kind, address);
    return null;
  },
});

/** Save my default ship-to address (buyers) or return address (sellers). */
export const saveAddress = action({
  args: { kind: kindValidator, address: addressValidator },
  handler: async (ctx, { kind, address }) => {
    const me = await ctx.runMutation(_whoAmI, {});
    const isSeller = me.accountType === "seller" || me.role === "admin";
    const isBuyer = me.accountType === "buyer" || me.role === "admin";
    if (kind === "ship_from" && !isSeller)
      throw new AppError({ code: "FORBIDDEN", message: "Only sellers have a return address" });
    if (kind === "ship_to" && !isBuyer)
      throw new AppError({ code: "FORBIDDEN", message: "Only buyers have a shipping address" });
    const checked = await verified(address);
    await ctx.runMutation(_saveAddress, { kind, address: checked });
    return checked;
  },
});
