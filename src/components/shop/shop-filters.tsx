"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import type { Category, Condition } from "@/lib/listings.ts";
import { SELLER_DETAIL_FIELDS } from "@/shared/sellerDetails.ts";
import { cn } from "@/lib/utils.ts";

const PRICE_BANDS = [
  { value: "u30", label: "Under $30", max: 30_00 },
  { value: "30-60", label: "$30 – $60", min: 30_00, max: 60_00 },
  { value: "60-100", label: "$60 – $100", min: 60_00, max: 100_00 },
  { value: "100", label: "$100+", min: 100_00 },
] as const;

const LISTED = [
  { value: "1", label: "Today" },
  { value: "7", label: "This week" },
  { value: "31", label: "This month" },
] as const;

const SALE_TYPES = [
  { value: "fixed", label: "Buy it now" },
  { value: "auction", label: "Auction" },
] as const;

export type Option = { value: string; label: string };
export type Group = { key: string; label: string; options: Option[]; multi: boolean };

const asOptions = (values: readonly string[]): Option[] =>
  values.map((x) => ({ value: x, label: x }));

const CONTINENTS: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico"],
  "South America": ["Brazil", "Argentina", "Colombia", "Chile"],
  Europe: [
    "United Kingdom", "Ireland", "Germany", "France", "Spain", "Italy", "Netherlands",
    "Belgium", "Sweden", "Norway", "Denmark", "Finland", "Poland", "Portugal",
    "Austria", "Switzerland", "Czech Republic",
  ],
  Asia: ["Japan", "South Korea", "Philippines", "Thailand", "India"],
  Africa: ["South Africa"],
  Oceania: ["Australia", "New Zealand"],
};

/** Seller-profile fields shown as filters, in the order of the filter panel. */
const SELLER_FILTER_KEYS = [
  "gender",
  "ageRange",
  "ethnicity",
] as const;
const SELLER_FILTER_KEYS_2 = [
  "country",
] as const;
const SELLER_FILTER_KEYS_3 = [
  "bodySize",
  "shoeSize",
  "height",
  "hairColor",
  "eyeColor",
  "tattoos",
  "piercings",
  "showFace",
  "occupation",
  "smokes",
  "drinks",
  "relationshipStatus",
  "pregnant",
] as const;

const SELLER_KEYS = new Set<string>([
  ...SELLER_FILTER_KEYS,
  ...SELLER_FILTER_KEYS_2,
  ...SELLER_FILTER_KEYS_3,
]);

const LABELS: Record<string, string> = {
  showFace: "Will show face",
  pregnant: "Pregnant sellers",
  ageRange: "Age",
};

const sellerGroup = (key: string): Group => {
  const field = SELLER_DETAIL_FIELDS.find((f) => f.key === key)!;
  return {
    key,
    label: LABELS[key] ?? field.label.replace(" (US)", ""),
    options: asOptions(field.options),
    multi: true,
  };
};

/** Every filter the shop offers, in the order shown in the filter panel. */
export const SHOP_FILTER_GROUPS: Group[] = [
  { key: "saleType", label: "Buy it now", options: [...SALE_TYPES], multi: false },
  { key: "price", label: "Price", options: [...PRICE_BANDS], multi: false },
  { key: "listed", label: "Listed date", options: [...LISTED], multi: false },
  ...SELLER_FILTER_KEYS.map(sellerGroup),
  { key: "verified", label: "Verified", options: [{ value: "yes", label: "Verified sellers only" }], multi: false },
  ...SELLER_FILTER_KEYS_2.map(sellerGroup),
  { key: "continent", label: "Continent", options: asOptions(Object.keys(CONTINENTS)), multi: true },
  ...SELLER_FILTER_KEYS_3.map(sellerGroup),
];

export type Selection = Record<string, string[]>;

/** Turns chosen filters into listings.browse arguments. */
export function toArgs(sel: Selection) {
  const one = (key: string) => sel[key]?.[0];
  const band = PRICE_BANDS.find((b) => b.value === one("price"));
  const listed = one("listed");
  const seller = Object.entries(sel)
    .filter(([key, values]) => SELLER_KEYS.has(key) && values.length > 0)
    .map(([key, values]) => ({ key, values }));
  // Continent narrows the country filter to that continent's countries.
  const continentCountries = (sel.continent ?? []).flatMap((c) => CONTINENTS[c] ?? []);
  if (continentCountries.length) {
    const chosen = sel.country ?? [];
    const narrowed = chosen.filter((c) => continentCountries.includes(c));
    const values = chosen.length && narrowed.length ? narrowed : continentCountries;
    const rest = seller.filter((f) => f.key !== "country");
    seller.length = 0;
    seller.push(...rest, { key: "country", values });
  }
  return {
    sort: "newest" as const,
    category: one("category") as Category | undefined,
    condition: one("condition") as Condition | undefined,
    saleType: one("saleType") as "fixed" | "auction" | undefined,
    minPriceCents: band && "min" in band ? band.min : undefined,
    maxPriceCents: band && "max" in band ? band.max : undefined,
    listedWithinDays: listed ? Number(listed) : undefined,
    verifiedOnly: one("verified") === "yes" || undefined,
    seller: seller.length ? seller : undefined,
  };
}

/** Chosen filters with toggle (single or multi choice per group) and clear. */
export function useFilterSelection() {
  const [selection, setSelection] = useState<Selection>({});
  const toggle = (group: Group, value: string) =>
    setSelection((prev) => {
      const current = prev[group.key] ?? [];
      const next = current.includes(value)
        ? current.filter((x) => x !== value)
        : group.multi
          ? [...current, value]
          : [value];
      return { ...prev, [group.key]: next };
    });
  const clear = () => setSelection({});
  const active = Object.values(selection).reduce((n, v) => n + v.length, 0);
  return { selection, toggle, clear, active };
}

/** Collapsible filter groups with choice chips. */
export function FilterGroups({
  groups,
  selection,
  onToggle,
  defaultOpen = [],
}: {
  groups: Group[];
  selection: Selection;
  onToggle: (group: Group, value: string) => void;
  defaultOpen?: string[];
}) {
  return (
    <Accordion type="multiple" defaultValue={defaultOpen}>
      {groups.map((group) => {
        const chosen = selection[group.key] ?? [];
        return (
          <AccordionItem key={group.key} value={group.key}>
            <AccordionTrigger className="cursor-pointer py-3 font-bold hover:no-underline [&>svg]:text-violet-600">
              <span>
                {group.label}
                {chosen.length > 0 && (
                  <span className="ml-2 rounded-full bg-violet-600 px-1.5 font-mono text-[11px] text-white">
                    {chosen.length}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex flex-wrap gap-1.5">
              {group.options.map((o) => {
                const on = chosen.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggle(group, o.value)}
                    className={cn(
                      "cursor-pointer rounded-[2px] border px-3 py-1 text-xs font-semibold transition-colors",
                      on
                        ? "border-violet-bright bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:border-violet-bright hover:text-foreground",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
