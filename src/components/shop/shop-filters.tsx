"use client";

import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useState } from "react";
import {
  BadgeCheck,
  Circle,
  Mars,
  ShoppingCart,
  Transgender,
  Venus,
  type LucideIcon,
} from "lucide-react";
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
  { value: "u25", label: "Under $25", max: 25_00 },
  { value: "25-50", label: "$25 - $50", min: 25_00, max: 50_00 },
  { value: "50-100", label: "$50 - $100", min: 50_00, max: 100_00 },
  { value: "100", label: "$100+", min: 100_00 },
] as const;

const LISTED = [
  { value: "1", label: "Last 24 hours" },
  { value: "2", label: "Last 48 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
] as const;

/**
 * A choice in a filter. `match` lists the seller-profile values it stands for
 * (defaults to the value itself), so friendly labels can cover several stored answers.
 */
export type Option = {
  value: string;
  label: string;
  match?: string[];
  icon?: LucideIcon;
  iconClass?: string;
};
export type Group = { key: string; label: string; options: Option[]; multi: boolean };

const opt = (label: string, match?: string[], extra: Partial<Option> = {}): Option => ({
  value: label,
  label,
  match,
  ...extra,
});

const yesNo = (yes: string[], no: string[]): Option[] => [opt("Yes", yes), opt("No", no)];

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

const SHOE_SIZES: Option[] = [
  ...Array.from({ length: 11 }, (_, i) => {
    const us = 5 + i;
    const match = [String(us), `${us}.5`];
    if (us === 5) match.unshift("4", "4.5");
    return opt(`US ${us}, UK ${us - 2}, EU ${us + 31}`, match);
  }),
  opt("US 16+, UK 14+, EU 47+", ["16+"]),
];

/** Height bands in inches, matched against the seller's stored feet-and-inches answer. */
const HEIGHT_BANDS: [string, number, number][] = [
  ["Petite", 0, 60],
  ["Short", 61, 63],
  ["Average", 64, 67],
  ["Tall", 68, 71],
  ["Very Tall", 72, 999],
];
const heightOptions = (): Option[] => {
  const all = SELLER_DETAIL_FIELDS.find((f) => f.key === "height")!.options as readonly string[];
  const inches = (h: string) => {
    const [ft, inch] = h.split(/['"]/);
    return Number(ft) * 12 + Number(inch);
  };
  return HEIGHT_BANDS.map(([label, min, max]) =>
    opt(label, all.filter((h) => inches(h) >= min && inches(h) <= max)),
  );
};

/** Seller-profile filters, keyed by the seller detail they read. */
const SELLER_OPTIONS: Record<string, { label: string; options: Option[] }> = {
  ageRange: {
    label: "Age",
    options: [
      opt("18-21", ["18-20"]),
      opt("21-25"),
      opt("25-30", ["26-30"]),
      opt("30-40"),
      opt("40-50"),
      opt("50+"),
      opt("60+"),
      opt("70+"),
    ],
  },
  ethnicity: {
    label: "Ethnicity",
    options: [
      opt("Arab", ["Middle Eastern"]),
      opt("Asian"),
      opt("Black"),
      opt("Caucasian (White)"),
      opt("Latin", ["Hispanic / Latina"]),
      opt("Mixed"),
    ],
  },
  showFace: { label: "Will Show Face", options: yesNo(["Yes", "Sometimes"], ["No"]) },
  bodySize: {
    label: "Body Size",
    options: [
      opt("Slim / Slender", ["Slim", "Petite"]),
      opt("Athletic / Toned", ["Athletic"]),
      opt("Average"),
      opt("Muscular"),
      opt("Curvy"),
      opt("Big & Beautiful", ["Plus size", "BBW"]),
    ],
  },
  shoeSize: { label: "Shoe Size", options: SHOE_SIZES },
  occupation: {
    label: "Occupation",
    options: [
      opt("Cabin Crew", ["Hospitality"]),
      opt("Nurse / Healthcare Worker", ["Healthcare"]),
      opt("Model"),
      opt("Fitness Pro", ["Fitness / Trainer"]),
      opt("Entrepreneur", ["Self-employed"]),
      opt("Teacher"),
      opt("Stay At Home Parent", ["Stay at home"]),
      opt("Military / Police"),
      opt("Student"),
      opt("Office Worker", ["Office worker"]),
      opt("Blue Collar Worker", ["Blue collar worker"]),
      opt("Digital Nomad / Tech Guru", ["Digital nomad / Tech"]),
    ],
  },
  gender: {
    label: "Gender",
    options: [
      opt("Female", ["Female"], { icon: Venus, iconClass: "text-white" }),
      opt("Male", ["Male"], { icon: Mars, iconClass: "text-white" }),
      opt("Transgender", ["Trans woman", "Trans man"], { icon: Transgender, iconClass: "text-white" }),
      opt("Other", ["Other", "Non-binary"], { icon: Circle, iconClass: "text-muted-foreground" }),
    ],
  },
  country: {
    label: "Country",
    options: (SELLER_DETAIL_FIELDS.find((f) => f.key === "country")!.options as readonly string[]).map(
      (c) => opt(c),
    ),
  },
  tattoos: { label: "Tattoos", options: yesNo(["A few", "Many"], ["None"]) },
  piercings: { label: "Piercings", options: yesNo(["Ears only", "A few", "Many"], ["None"]) },
  hairColor: {
    label: "Hair Color",
    options: [
      opt("Black"),
      opt("Brown", ["Brunette"]),
      opt("Blonde"),
      opt("Red", ["Red", "Auburn"]),
      opt("Gray"),
      opt("White"),
      opt("Blue"),
      opt("Pink"),
      opt("Purple"),
      opt("Green"),
    ],
  },
  eyeColor: {
    label: "Eye Color",
    options: ["Brown", "Blue", "Green", "Hazel", "Gray", "Amber"].map((c) => opt(c)),
  },
  smokes: { label: "Smokes", options: yesNo(["Yes", "Sometimes"], ["No"]) },
  drinks: { label: "Drinks", options: yesNo(["Yes", "Sometimes"], ["No"]) },
  height: { label: "Height", options: heightOptions() },
  relationshipStatus: {
    label: "Relationship Status",
    options: [
      opt("Single"),
      opt("In a Relationship", ["In a relationship"]),
      opt("Married"),
      opt("Divorced"),
      opt("It's Complicated", ["It's complicated"]),
      opt("Open Relationship", ["Open relationship"]),
      opt("Widowed"),
    ],
  },
  pregnant: { label: "Pregnant Sellers", options: [opt("Yes"), opt("No")] },
};

const SELLER_KEYS = new Set<string>(Object.keys(SELLER_OPTIONS));

const sellerGroup = (key: string): Group => ({
  key,
  label: SELLER_OPTIONS[key].label,
  options: SELLER_OPTIONS[key].options,
  multi: true,
});

/** Every filter the shop offers, in the order shown in the filter panel. */
export const SHOP_FILTER_GROUPS: Group[] = [
  {
    key: "saleType",
    label: "Buy It Now",
    options: [
      { value: "fixed", label: "Buy It Now Available", icon: ShoppingCart, iconClass: "text-foreground" },
    ],
    multi: false,
  },
  { key: "price", label: "Price", options: [...PRICE_BANDS], multi: false },
  sellerGroup("ageRange"),
  sellerGroup("ethnicity"),
  sellerGroup("showFace"),
  sellerGroup("bodySize"),
  sellerGroup("shoeSize"),
  sellerGroup("occupation"),
  sellerGroup("gender"),
  {
    key: "verified",
    label: "Verified",
    options: [{ value: "yes", label: "Verified", icon: BadgeCheck, iconClass: "text-muted-foreground" }],
    multi: false,
  },
  sellerGroup("country"),
  { key: "continent", label: "Continent", options: Object.keys(CONTINENTS).map((c) => opt(c)), multi: true },
  { key: "listed", label: "Listed Date", options: [...LISTED], multi: false },
  sellerGroup("tattoos"),
  sellerGroup("piercings"),
  sellerGroup("hairColor"),
  sellerGroup("eyeColor"),
  sellerGroup("smokes"),
  sellerGroup("drinks"),
  sellerGroup("height"),
  sellerGroup("relationshipStatus"),
  sellerGroup("pregnant"),
];

export type Selection = Record<string, string[]>;

/** Turns chosen filters into listings.browse arguments. */
export function toArgs(sel: Selection) {
  const one = (key: string) => sel[key]?.[0];
  const band = PRICE_BANDS.find((b) => b.value === one("price"));
  const listed = one("listed");
  const seller = Object.entries(sel)
    .filter(([key, values]) => SELLER_KEYS.has(key) && values.length > 0)
    .map(([key, values]) => ({
      key,
      values: [
        ...new Set(
          values.flatMap(
            (v) => SELLER_OPTIONS[key].options.find((o) => o.value === v)?.match ?? [v],
          ),
        ),
      ],
    }));
  // Continent narrows the country filter to that continent's countries.
  const continentCountries = (sel.continent ?? []).flatMap((c) => CONTINENTS[c] ?? []);
  if (continentCountries.length) {
    const chosen = seller.find((f) => f.key === "country")?.values ?? [];
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

/** Collapsible filter groups, each a plain checkbox list. */
export function FilterGroups({
  groups,
  selection,
  onToggle,
  defaultOpen,
}: {
  groups: Group[];
  selection: Selection;
  onToggle: (group: Group, value: string) => void;
  defaultOpen?: string[];
}) {
  return (
    <Accordion type="multiple" defaultValue={defaultOpen ?? groups.map((g) => g.key)}>
      {groups.map((group) => {
        const chosen = selection[group.key] ?? [];
        return (
          <AccordionItem key={group.key} value={group.key} className="border-b border-[#59595b40]">
            <AccordionTrigger className="cursor-pointer items-center py-2 text-[15px] font-bold hover:no-underline [&>svg]:translate-y-0 [&>svg]:text-violet-600">
              <span>
                {group.label}
                {chosen.length > 0 && (
                  <span className="ml-2 rounded-full bg-violet-600 px-1.5 font-mono text-[11px] text-white">
                    {chosen.length}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-0.5 pt-0 pb-3">
              {group.options.map((o) => {
                const Icon = o.icon;
                return (
                  <Label
                    key={o.value}
                    className="cursor-pointer gap-2.5 py-1 text-[15px] font-normal transition-colors"
                  >
                    <Checkbox
                      checked={chosen.includes(o.value)}
                      onCheckedChange={() => onToggle(group, o.value)}
                    />
                    {Icon && <Icon className={cn("size-4 shrink-0", o.iconClass)} aria-hidden />}
                    {o.label}
                  </Label>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
