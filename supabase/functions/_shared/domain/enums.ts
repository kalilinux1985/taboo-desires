// Allowed values for the text "enum" columns (mirrored by CHECK constraints in the migration).

export const CATEGORIES = [
  "panties",
  "bras",
  "lingerie",
  "socks",
  "shoes",
  "activewear",
  "clothing",
  "extras",
  "custom",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Wear time
export const CONDITIONS = [
  "one_day",
  "two_three_days",
  "week",
  "custom_wear",
] as const;
export type Condition = (typeof CONDITIONS)[number];

// "ended" = auction closed with no bids (unsold)
export const LISTING_STATUSES = ["active", "sold", "ended"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const SALE_TYPES = ["fixed", "auction"] as const;
export type SaleType = (typeof SALE_TYPES)[number];

export const MEDIA_KINDS = ["image", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export type UnlockStatus = "pending" | "granted" | "declined";
export type SubscriptionStatus =
  | "pending"
  | "active"
  | "declined"
  | "cancelled";
// "pending" = waiting on whoever did NOT make the latest offer
export type CustomStatus = "pending" | "accepted" | "declined" | "cancelled";
export type Party = "buyer" | "seller";

// status = text only, photo = has images, listing = new or reposted listing
export const POST_KINDS = ["status", "photo", "listing"] as const;
export type PostKind = (typeof POST_KINDS)[number];
