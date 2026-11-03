import { SELLER_DETAIL_FIELDS } from "./sellerDetails.ts";

const optionsOf = (key: "gender" | "ageRange" | "country") =>
  SELLER_DETAIL_FIELDS.find((f) => f.key === key)?.options ?? [];

/** Optional buyer profile answers. Gender / age / country reuse the seller option lists. */
export const BUYER_DETAIL_FIELDS = [
  { key: "gender", label: "Gender", options: optionsOf("gender") },
  { key: "ageRange", label: "Age", options: optionsOf("ageRange") },
  { key: "country", label: "Country", options: optionsOf("country") },
] as const;

/** Chips shown under "What I'm looking for". */
export const LOOKING_FOR_OPTIONS = [
  "Worn panties",
  "Bras",
  "Socks",
  "Shoes",
  "Gym wear",
  "Lingerie",
  "Instant Photos",
  "Instant Vids",
  "Custom requests",
] as const;

export type BuyerDetailKey = (typeof BUYER_DETAIL_FIELDS)[number]["key"];
export type BuyerDetails = Partial<Record<BuyerDetailKey, string>> & {
  lookingFor?: string[];
};

/** Returns an error message for the first invalid answer, else null. */
export function invalidBuyerDetail(details: BuyerDetails): string | null {
  for (const field of BUYER_DETAIL_FIELDS) {
    const value = details[field.key];
    if (
      value !== undefined &&
      !(field.options as readonly string[]).includes(value)
    ) {
      return `Invalid ${field.label.toLowerCase()}`;
    }
  }
  const picks = details.lookingFor ?? [];
  const allowed: readonly string[] = LOOKING_FOR_OPTIONS;
  if (
    picks.some((p) => !allowed.includes(p)) ||
    new Set(picks).size !== picks.length
  ) {
    return 'Invalid "looking for" choice';
  }
  return null;
}
