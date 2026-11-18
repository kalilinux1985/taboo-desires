// Prepaid shipping labels through EasyPost: quote rates, buy and print a
// label, void it, and follow tracking. Every EasyPost call happens in an
// action (no transaction open); the order is read and saved through internal
// mutations around it, so a retried transaction never buys a label twice.

import { AppError } from "../core/errors.ts";
import { action, internalMutation, query } from "../core/functions.ts";
import { v } from "../core/values.ts";
import {
  IN_TRANSIT_STATUSES,
  MAX_WEIGHT_OZ,
  PACKAGE_PRESETS,
} from "../domain/shipping.ts";
import {
  buyShipment,
  createShipment,
  easyPostMode,
  getShipment,
  getTracker,
  labelUrlOf,
  refundShipment,
  shippingError,
  toCents,
} from "../lib/easypost.ts";
import { getOrderAs, getSavedAddress } from "./orders.ts";

const nowIso = (ctx: { now(): number }) => new Date(ctx.now()).toISOString();

/** "test" labels are free and fake, "live" ones cost money, "missing" = no key yet. */
export const mode = query({
  args: {},
  handler: async () => easyPostMode(),
});

// ---------------------------------------------------------------------------
// Rates
// ---------------------------------------------------------------------------

export const _prepareRates = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const { order, me } = await getOrderAs(ctx, orderId, "seller", { pro: true });
    if (order.status === "awaiting_address")
      throw new AppError({ code: "CONFLICT", message: "The buyer hasn't added their address yet" });
    if (order.status !== "ready_to_ship")
      throw new AppError({ code: "CONFLICT", message: "This order already has a label" });
    if (!order.shipTo)
      throw new AppError({ code: "CONFLICT", message: "The buyer hasn't added their address yet" });
    const from = await getSavedAddress(ctx, me._id, "ship_from");
    if (!from)
      throw new AppError({ code: "BAD_REQUEST", message: "Add your return address first" });
    return { to: order.shipTo, from };
  },
});

export const _saveShipment = internalMutation({
  args: { orderId: v.id("orders"), shipmentId: v.string() },
  handler: async (ctx, { orderId, shipmentId }) => {
    const { order } = await getOrderAs(ctx, orderId, "seller", { pro: true });
    if (order.status !== "ready_to_ship") return null;
    await ctx.db.patch("orders", orderId, { easypostShipmentId: shipmentId });
    return null;
  },
});

/** Seller picks a package and weight; returns the prices they can buy. */
export const getRates = action({
  args: {
    orderId: v.id("orders"),
    presetId: v.string(),
    weightOz: v.number(),
  },
  handler: async (ctx, { orderId, presetId, weightOz }) => {
    const preset = PACKAGE_PRESETS.find((p) => p.id === presetId);
    if (!preset) throw new AppError({ code: "BAD_REQUEST", message: "Pick a package" });
    if (!Number.isFinite(weightOz) || weightOz < 0.5 || weightOz > MAX_WEIGHT_OZ)
      throw new AppError({ code: "BAD_REQUEST", message: "Enter the package weight in ounces" });

    const { to, from } = await ctx.runMutation(_prepareRates, { orderId });
    let shipment;
    try {
      shipment = await createShipment({
        from,
        to,
        parcel: {
          length: preset.length,
          width: preset.width,
          height: preset.height,
          weightOz: Math.round(weightOz * 10) / 10,
        },
        reference: orderId,
      });
    } catch (e) {
      throw shippingError(e, "Couldn't get shipping prices");
    }
    await ctx.runMutation(_saveShipment, { orderId, shipmentId: shipment.id });

    const rates = (shipment.rates ?? [])
      .map((r) => ({
        id: r.id,
        carrier: r.carrier,
        service: r.service.replace(/([a-z])([A-Z])/g, "$1 $2"),
        cents: toCents(r.rate) ?? 0,
        days: r.delivery_days ?? r.est_delivery_days ?? null,
      }))
      .filter((r) => r.cents > 0)
      .sort((a, b) => a.cents - b.cents);
    if (rates.length === 0) {
      const why = shipment.messages?.map((m) => m.message).filter(Boolean)[0];
      throw new AppError({
        code: "BAD_REQUEST",
        message: why ? `No prices available: ${why}` : "No prices available for this package",
      });
    }
    return { rates, mode: easyPostMode() };
  },
});

// ---------------------------------------------------------------------------
// Buying, voiding
// ---------------------------------------------------------------------------

export const _shipmentFor = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const { order } = await getOrderAs(ctx, orderId, "seller");
    return {
      status: order.status,
      shipmentId: order.easypostShipmentId ?? null,
      labelUrl: order.labelUrl ?? null,
    };
  },
});

export const _saveLabel = internalMutation({
  args: {
    orderId: v.id("orders"),
    shipmentId: v.string(),
    carrier: v.string(),
    service: v.string(),
    postageCents: v.optional(v.number()),
    trackingCode: v.string(),
    trackingUrl: v.optional(v.string()),
    labelUrl: v.string(),
  },
  handler: async (ctx, { orderId, ...label }) => {
    const { order } = await getOrderAs(ctx, orderId, "seller", { pro: true });
    // Already saved by an earlier attempt
    if (order.labelUrl) return null;
    if (order.easypostShipmentId !== label.shipmentId)
      throw new AppError({ code: "CONFLICT", message: "These prices are out of date. Get new prices." });
    const now = nowIso(ctx);
    await ctx.db.patch("orders", orderId, {
      status: "label_created",
      carrier: label.carrier,
      service: label.service,
      postageCents: label.postageCents,
      trackingCode: label.trackingCode,
      trackingUrl: label.trackingUrl,
      trackingStatus: "pre_transit",
      labelUrl: label.labelUrl,
      labelCreatedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

/** Buys the chosen rate and attaches the label and tracking number to the order. */
export const buyLabel = action({
  args: { orderId: v.id("orders"), rateId: v.string() },
  handler: async (ctx, { orderId, rateId }) => {
    const current = await ctx.runMutation(_shipmentFor, { orderId });
    if (current.labelUrl) return { labelUrl: current.labelUrl };
    if (current.status !== "ready_to_ship" || !current.shipmentId)
      throw new AppError({ code: "CONFLICT", message: "Get prices for this order first" });

    let shipment;
    try {
      shipment = await buyShipment(current.shipmentId, rateId);
    } catch (e) {
      throw shippingError(e, "Couldn't buy the label");
    }
    const labelUrl = labelUrlOf(shipment);
    if (!labelUrl || !shipment.tracking_code)
      throw new AppError({ code: "INTERNAL", message: "The label wasn't ready. Try again in a minute." });

    await ctx.runMutation(_saveLabel, {
      orderId,
      shipmentId: shipment.id,
      carrier: shipment.selected_rate?.carrier ?? "",
      service: (shipment.selected_rate?.service ?? "").replace(/([a-z])([A-Z])/g, "$1 $2"),
      postageCents: toCents(shipment.selected_rate?.rate),
      trackingCode: shipment.tracking_code,
      trackingUrl: shipment.tracker?.public_url ?? undefined,
      labelUrl,
    });
    return { labelUrl };
  },
});

export const _clearLabel = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const { order } = await getOrderAs(ctx, orderId, "seller");
    if (order.status !== "label_created") return null;
    await ctx.db.patch("orders", orderId, {
      status: "ready_to_ship",
      easypostShipmentId: undefined,
      carrier: undefined,
      service: undefined,
      postageCents: undefined,
      trackingCode: undefined,
      trackingUrl: undefined,
      trackingStatus: undefined,
      labelUrl: undefined,
      labelCreatedAt: undefined,
      updatedAt: nowIso(ctx),
    });
    return null;
  },
});

/**
 * Voids an unused label: EasyPost asks the carrier for a refund (USPS takes
 * up to a few weeks), and the order goes back to "ready to ship".
 */
export const voidLabel = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const current = await ctx.runMutation(_shipmentFor, { orderId });
    if (current.status !== "label_created" || !current.shipmentId)
      throw new AppError({
        code: "CONFLICT",
        message: "Only a label that hasn't been scanned by the carrier can be voided",
      });
    try {
      const res = await refundShipment(current.shipmentId);
      if (res.refund_status === "rejected" || res.refund_status === "not_applicable")
        throw new AppError({
          code: "CONFLICT",
          message: "The carrier wouldn't void this label (it may already be scanned)",
        });
    } catch (e) {
      throw shippingError(e, "Couldn't void the label");
    }
    await ctx.runMutation(_clearLabel, { orderId });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

export const _trackingTarget = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    // Either side may refresh tracking
    let found;
    try {
      found = await getOrderAs(ctx, orderId, "buyer");
    } catch {
      found = await getOrderAs(ctx, orderId, "seller");
    }
    const o = found.order;
    return { shipmentId: o.easypostShipmentId ?? null, status: o.status, labelUrl: o.labelUrl ?? null };
  },
});

export const _applyTracking = internalMutation({
  args: {
    orderId: v.id("orders"),
    trackingStatus: v.string(),
    trackingUrl: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, trackingStatus, trackingUrl }) => {
    const order = await ctx.db.get("orders", orderId);
    if (!order || order.status === "cancelled" || order.status === "delivered") return null;
    await ctx.db.patch("orders", orderId, nextTracking(order, trackingStatus, trackingUrl, nowIso(ctx)));
    return null;
  },
});

/** The order fields to change for a new tracker status (also used by the webhook). */
export function nextTracking(
  order: { status: string; shippedAt?: string; trackingUrl?: string },
  trackingStatus: string,
  trackingUrl: string | undefined,
  now: string,
) {
  const patch: Record<string, string | undefined> = {
    trackingStatus,
    trackingUrl: trackingUrl || order.trackingUrl,
    updatedAt: now,
  };
  if (trackingStatus === "delivered") {
    patch.status = "delivered";
    patch.deliveredAt = now;
    patch.shippedAt = order.shippedAt ?? now;
  } else if (IN_TRANSIT_STATUSES.has(trackingStatus) && order.status === "label_created") {
    patch.status = "shipped";
    patch.shippedAt = now;
  }
  return patch as { trackingStatus: string; updatedAt: string };
}

/** Pulls the latest tracking from EasyPost (tracking also updates by itself via the webhook). */
export const refreshTracking = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const target = await ctx.runMutation(_trackingTarget, { orderId });
    if (!target.shipmentId || !target.labelUrl) return null;
    try {
      const shipment = await getShipment(target.shipmentId);
      const tracker = shipment.tracker?.id ? await getTracker(shipment.tracker.id) : null;
      if (!tracker?.status) return null;
      await ctx.runMutation(_applyTracking, {
        orderId,
        trackingStatus: tracker.status,
        trackingUrl: tracker.public_url ?? undefined,
      });
      return tracker.status;
    } catch (e) {
      throw shippingError(e, "Couldn't refresh tracking");
    }
  },
});
