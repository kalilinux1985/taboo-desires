import type { Doc } from "@/lib/backend/types.ts";

export type Category = Doc<"listings">["category"];
export type Condition = Doc<"listings">["condition"];

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "panties", label: "Panties" },
  { value: "bras", label: "Bras" },
  { value: "lingerie", label: "Lingerie" },
  { value: "socks", label: "Socks" },
  { value: "shoes", label: "Shoes" },
  { value: "activewear", label: "Activewear" },
  { value: "custom", label: "Customs" },
];

// "Condition" is the wear time for this marketplace
export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "one_day", label: "1 day wear" },
  { value: "two_three_days", label: "2-3 days" },
  { value: "week", label: "5-7 days" },
  { value: "custom_wear", label: "Custom wear time" },
];

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
) as Record<Category, string>;

export const CONDITION_LABEL = Object.fromEntries(
  CONDITIONS.map((c) => [c.value, c.label]),
) as Record<Condition, string>;

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }
  return fallback;
}
