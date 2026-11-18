// Shipping rules shared by the backend and the frontend: order statuses,
// addresses, package presets and tracking links.

export type OrderStatus =
  | "awaiting_address"
  | "ready_to_ship"
  | "label_created"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_address: "Waiting for address",
  ready_to_ship: "Ready to ship",
  label_created: "Label created",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** US addresses only for now (labels are domestic USPS/UPS/FedEx). */
export type ShippingAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: "US";
  phone?: string;
};

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "PR",
  "AA", "AE", "AP",
] as const;

/** Trims and checks an address. Returns the clean address or a message to show. */
export function cleanAddress(
  raw: Partial<Record<keyof ShippingAddress, string | undefined>>,
): { ok: true; address: ShippingAddress } | { ok: false; message: string } {
  const t = (s: string | undefined) => (s ?? "").trim().replace(/\s+/g, " ");
  const name = t(raw.name);
  const street1 = t(raw.street1);
  const street2 = t(raw.street2);
  const city = t(raw.city);
  const state = t(raw.state).toUpperCase();
  const zip = t(raw.zip);
  const phone = t(raw.phone).replace(/[^\d+]/g, "");
  if (name.length < 2 || name.length > 60) return { ok: false, message: "Enter the name for the label" };
  if (street1.length < 3 || street1.length > 80) return { ok: false, message: "Enter a street address or PO box" };
  if (street2.length > 80) return { ok: false, message: "Address line 2 is too long" };
  if (city.length < 2 || city.length > 60) return { ok: false, message: "Enter a city" };
  if (!(US_STATES as readonly string[]).includes(state)) return { ok: false, message: "Pick a state" };
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return { ok: false, message: "Enter a 5-digit ZIP code" };
  if (phone && (phone.length < 10 || phone.length > 15)) return { ok: false, message: "Enter a valid phone number or leave it blank" };
  return {
    ok: true,
    address: {
      name,
      street1,
      ...(street2 ? { street2 } : {}),
      city,
      state,
      zip,
      country: "US",
      ...(phone ? { phone } : {}),
    },
  };
}

/** What the seller sees about where an order ships: no street, no name. */
export function cityLine(a: ShippingAddress | undefined | null): string | null {
  return a ? `${a.city}, ${a.state}` : null;
}

export type PackagePreset = {
  id: string;
  label: string;
  /** Inches; omitted for carrier envelopes priced by weight only */
  length: number;
  width: number;
  height: number;
};

export const PACKAGE_PRESETS: PackagePreset[] = [
  { id: "poly_small", label: "Small poly mailer (10 × 13 in)", length: 13, width: 10, height: 1 },
  { id: "padded_envelope", label: "Padded envelope (9 × 12 in)", length: 12, width: 9, height: 1 },
  { id: "poly_large", label: "Large poly mailer (14 × 19 in)", length: 19, width: 14, height: 2 },
  { id: "small_box", label: "Small box (8 × 6 × 4 in)", length: 8, width: 6, height: 4 },
  { id: "shoe_box", label: "Shoe box (14 × 10 × 5 in)", length: 14, width: 10, height: 5 },
];

export const MAX_WEIGHT_OZ = 70 * 16;

export const CARRIERS = ["USPS", "UPS", "FedEx", "DHL"] as const;
export type Carrier = (typeof CARRIERS)[number];

/** A public tracking page for a number the seller typed in themselves. */
export function carrierTrackingUrl(carrier: string, code: string): string | null {
  const c = encodeURIComponent(code);
  switch (carrier.toUpperCase()) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${c}`;
    case "UPS":
      return `https://www.ups.com/track?tracknum=${c}`;
    case "FEDEX":
      return `https://www.fedex.com/fedextrack/?trknbr=${c}`;
    case "DHL":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${c}`;
    default:
      return null;
  }
}

/** EasyPost tracker statuses that mean the carrier has the package. */
export const IN_TRANSIT_STATUSES = new Set([
  "in_transit",
  "out_for_delivery",
  "available_for_pickup",
  "return_to_sender",
  "failure",
]);

export const TRACKING_STATUS_LABEL: Record<string, string> = {
  pre_transit: "Label created, not scanned yet",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  available_for_pickup: "Ready for pickup",
  return_to_sender: "Returning to sender",
  failure: "Delivery problem",
  cancelled: "Cancelled",
  error: "Tracking error",
  unknown: "No updates yet",
};
