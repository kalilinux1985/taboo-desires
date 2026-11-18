// Minimal EasyPost REST client (https://docs.easypost.com). Plain fetch: the
// loader only provides postgres and supabase-js, so no SDK.
//
// Needs the EASYPOST_API_KEY secret on the Supabase project (Edge Functions →
// Secrets). Test keys (EZTK...) make free fake labels; live keys (EZAK...)
// charge the EasyPost wallet.
//
// Only call these from actions, never from inside a query or mutation.

import { AppError } from "../core/errors.ts";
import type { ShippingAddress } from "../domain/shipping.ts";

const BASE = "https://api.easypost.com/v2";

type DenoLike = { env: { get(name: string): string | undefined } };

function apiKey(): string | null {
  const deno = (globalThis as { Deno?: DenoLike }).Deno;
  return deno?.env.get("EASYPOST_API_KEY")?.trim() || null;
}

export type EasyPostMode = "test" | "live" | "missing";

export function easyPostMode(): EasyPostMode {
  const key = apiKey();
  if (!key) return "missing";
  return key.startsWith("EZTK") ? "test" : "live";
}

type EasyPostError = { error?: { code?: string; message?: string; errors?: { message?: string }[] } };

export class EasyPostRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "EasyPostRequestError";
  }
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = apiKey();
  if (!key) {
    throw new AppError({
      code: "BAD_REQUEST",
      message: "Shipping labels aren't set up yet. The site owner needs to add the EasyPost key.",
    });
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${key}:`)}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // fall through with null
  }
  if (!res.ok) {
    const err = (json as EasyPostError | null)?.error;
    const detail = err?.errors?.map((e) => e.message).filter(Boolean).join("; ");
    throw new EasyPostRequestError(
      res.status,
      err?.code ?? `HTTP_${res.status}`,
      [err?.message, detail].filter(Boolean).join(": ") || `EasyPost error ${res.status}`,
    );
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// Types (only the fields this app uses)
// ---------------------------------------------------------------------------

type EpAddress = {
  id: string;
  name?: string | null;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  phone?: string | null;
  verifications?: {
    delivery?: { success: boolean; errors?: { message?: string }[] };
  };
};

export type EpRate = {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  delivery_days?: number | null;
  est_delivery_days?: number | null;
};

export type EpShipment = {
  id: string;
  rates?: EpRate[];
  messages?: { carrier?: string; message?: string }[];
  selected_rate?: EpRate | null;
  tracking_code?: string | null;
  postage_label?: { label_url?: string | null; label_pdf_url?: string | null } | null;
  tracker?: { id: string; status?: string | null; public_url?: string | null } | null;
  refund_status?: string | null;
};

export type EpTracker = {
  id: string;
  tracking_code: string;
  status?: string | null;
  public_url?: string | null;
};

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

const toEp = (a: ShippingAddress) => ({
  name: a.name,
  street1: a.street1,
  street2: a.street2 ?? "",
  city: a.city,
  state: a.state,
  zip: a.zip,
  country: a.country,
  phone: a.phone ?? "",
});

/**
 * Checks that USPS can deliver to the address and returns it in the carrier's
 * standard form (e.g. "123 MAIN ST APT 4"). Throws a message to show if not.
 */
export async function verifyAddress(a: ShippingAddress): Promise<ShippingAddress> {
  const res = await call<EpAddress>("POST", "/addresses", {
    address: { ...toEp(a), verify: ["delivery"] },
  });
  const delivery = res.verifications?.delivery;
  if (!delivery?.success) {
    const why = delivery?.errors?.map((e) => e.message).filter(Boolean)[0];
    throw new AppError({
      code: "BAD_REQUEST",
      message: why
        ? `We couldn't verify that address: ${why}`
        : "We couldn't verify that address. Check the street, city and ZIP.",
    });
  }
  return {
    name: a.name,
    street1: res.street1 || a.street1,
    ...(res.street2 || a.street2 ? { street2: res.street2 || a.street2 } : {}),
    city: res.city || a.city,
    state: res.state || a.state,
    zip: res.zip || a.zip,
    country: "US",
    ...(a.phone ? { phone: a.phone } : {}),
  };
}

export async function createShipment(input: {
  from: ShippingAddress;
  to: ShippingAddress;
  parcel: { length: number; width: number; height: number; weightOz: number };
  reference: string;
}): Promise<EpShipment> {
  return await call<EpShipment>("POST", "/shipments", {
    shipment: {
      from_address: toEp(input.from),
      to_address: toEp(input.to),
      parcel: {
        length: input.parcel.length,
        width: input.parcel.width,
        height: input.parcel.height,
        weight: input.parcel.weightOz,
      },
      options: { label_format: "PDF", label_size: "4x6" },
      reference: input.reference,
    },
  });
}

export async function getShipment(id: string): Promise<EpShipment> {
  return await call<EpShipment>("GET", `/shipments/${encodeURIComponent(id)}`);
}

/**
 * Buys one rate. Safe to repeat: if the shipment already has a label (a double
 * click, or a retry after a timeout), the existing label is returned.
 */
export async function buyShipment(id: string, rateId: string): Promise<EpShipment> {
  try {
    return await call<EpShipment>("POST", `/shipments/${encodeURIComponent(id)}/buy`, {
      rate: { id: rateId },
    });
  } catch (e) {
    if (!(e instanceof EasyPostRequestError)) throw e;
    const existing = await getShipment(id).catch(() => null);
    if (existing?.postage_label) return existing;
    throw e;
  }
}

export async function refundShipment(id: string): Promise<EpShipment> {
  return await call<EpShipment>("POST", `/shipments/${encodeURIComponent(id)}/refund`);
}

export async function getTracker(id: string): Promise<EpTracker> {
  return await call<EpTracker>("GET", `/trackers/${encodeURIComponent(id)}`);
}

export function labelUrlOf(s: EpShipment): string | null {
  return s.postage_label?.label_pdf_url || s.postage_label?.label_url || null;
}

/** "7.58" → 758 */
export function toCents(rate: string | null | undefined): number | undefined {
  if (!rate) return undefined;
  const n = Math.round(Number(rate) * 100);
  return Number.isFinite(n) ? n : undefined;
}

/** Turns an EasyPost failure into a message a seller can act on. */
export function shippingError(e: unknown, fallback: string): AppError {
  if (e instanceof AppError) return e;
  if (e instanceof EasyPostRequestError) {
    console.error("EasyPost", e.status, e.code, e.message);
    if (e.status === 401 || e.status === 403)
      return new AppError({ code: "INTERNAL", message: "Shipping is misconfigured. Please contact support." });
    if (e.code.includes("PAYMENT") || /insufficient|balance|funds/i.test(e.message))
      return new AppError({ code: "CONFLICT", message: "Labels are paused right now (postage account needs funds). Please try again later." });
    return new AppError({ code: "BAD_REQUEST", message: `${fallback}: ${e.message}` });
  }
  console.error(fallback, e);
  return new AppError({ code: "INTERNAL", message: fallback });
}
