import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ShoppingBag, SlidersHorizontal, Store } from "lucide-react";
import { CATEGORIES } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import {
  FilterGroups,
  SHOP_FILTER_GROUPS,
  toArgs,
  useFilterSelection,
  type Group,
  type Selection,
} from "@/components/shop/shop-filters.tsx";
import { ShopGrid } from "@/components/shop/shop-grid.tsx";

function FilterPanel({
  selection,
  onToggle,
  onClear,
}: {
  selection: Selection;
  onToggle: (group: Group, value: string) => void;
  onClear: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = Object.values(selection).reduce((n, v) => n + v.length, 0);
  return (
    <aside
      aria-label="Filters"
      className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1"
    >
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="flex w-full cursor-pointer items-center justify-between rounded-sm border bg-card px-4 py-3 font-bold lg:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-violet-400" /> Filters
          {active > 0 && (
            <span className="rounded-full bg-violet-400 px-2 font-mono text-xs text-background">
              {active}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("size-4 text-violet-400 transition-transform", mobileOpen && "rotate-180")}
        />
      </button>

      <div className={cn("pt-3 lg:block lg:pt-0", !mobileOpen && "hidden")}>
        <div className="flex items-center justify-between pb-1">
          <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.16em]">
            <SlidersHorizontal className="size-4 text-violet-400" /> Filter
          </p>
          {active > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="cursor-pointer text-xs font-bold text-violet-400 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <FilterGroups
          groups={SHOP_FILTER_GROUPS}
          selection={selection}
          onToggle={onToggle}
          defaultOpen={["category", "saleType", "price"]}
        />
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Calls to action
// ---------------------------------------------------------------------------

const SELL_POINTS = [
  "0% commission. Keep every dollar you earn",
  "Sell worn items, custom requests and locked photo sets",
  "Run auctions with anti-snipe time extensions",
  "Earn a verified badge that buyers trust",
];

const BUY_POINTS = [
  "Private and discreet. Shop under a pseudonym",
  "Browse shops and follow your favorite sellers",
  "Message verified sellers directly",
  "Request custom items made just for you",
];

function CtaPanel({
  tone,
  icon: Icon,
  title,
  lead,
  points,
  action,
  to,
}: {
  tone: "sell" | "buy";
  icon: typeof Store;
  title: string;
  lead: string;
  points: string[];
  action: string;
  to: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-5 overflow-hidden px-6 py-8 sm:px-10 sm:py-10",
        tone === "sell" ? "bg-primary" : "border bg-[#070b16]",
      )}
    >
      {tone === "buy" && (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_100%,rgb(244_114_182/0.28),transparent_70%),radial-gradient(50%_60%_at_85%_10%,rgb(124_58_237/0.35),transparent_70%)]"
        />
      )}
      <div className="relative flex items-start gap-4">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-lg bg-white/12 text-white">
          <Icon className="size-6" />
        </span>
        <div>
          <h2
            className={cn(
              "font-display text-3xl italic leading-tight",
              tone === "sell" ? "text-white" : "text-violet-400",
            )}
          >
            {title}
          </h2>
          <p className="mt-1 text-white/80">{lead}</p>
        </div>
      </div>
      <ul className="relative flex flex-col gap-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-white/90">
            <Check
              className={cn(
                "mt-0.5 size-4 shrink-0",
                tone === "sell" ? "text-accent-foreground" : "text-violet-400",
              )}
              strokeWidth={3}
            />
            {p}
          </li>
        ))}
      </ul>
      <Link
        href={to}
        className="relative w-fit cursor-pointer rounded-full bg-white px-8 py-3 font-extrabold text-indigo-950 transition-transform hover:-translate-y-0.5"
      >
        {action}
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ShopLanding() {
  const { selection, toggle, clear } = useFilterSelection();
  const args = useMemo(() => toArgs(selection), [selection]);

  const category = CATEGORIES.find((c) => c.value === selection.category?.[0]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-16 pt-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            18+ intimate apparel marketplace
          </p>
          <h1 className="mt-1.5 font-display text-4xl leading-tight text-balance md:text-5xl">
            Shop for{" "}
            <em className="text-violet-400">
              Used {category ? category.label : "Intimates"}
            </em>
          </h1>
        </div>
        <Link
          href="/browse"
          className="cursor-pointer text-sm font-semibold uppercase tracking-wider underline-offset-4 hover:underline"
        >
          Search all
        </Link>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <FilterPanel selection={selection} onToggle={toggle} onClear={clear} />
        <ShopGrid
          args={args}
          filtered={Object.values(selection).some((v) => v.length > 0)}
          onClear={clear}
        />
      </div>

      <Link
        href="/signin"
        className="group flex cursor-pointer items-center justify-center gap-3 rounded-sm border border-violet-600 bg-primary px-4 py-6 text-xl font-extrabold text-primary-foreground shadow-[0_18px_40px_-18px_rgb(124_58_237/0.65)] transition-colors hover:bg-violet-600"
      >
        Get Started
        <ArrowRight className="size-6 transition-transform group-hover:translate-x-1" />
      </Link>

      <section className="grid gap-6 md:grid-cols-2">
        <CtaPanel
          tone="sell"
          icon={Store}
          title="Start selling now"
          lead="Open your shop and list your first item in minutes."
          points={SELL_POINTS}
          action="Sell now"
          to="/sell"
        />
        <CtaPanel
          tone="buy"
          icon={ShoppingBag}
          title="Buy exclusive items"
          lead="Worn pieces and customs straight from real sellers."
          points={BUY_POINTS}
          action="Start buying"
          to="/browse"
        />
      </section>
    </div>
  );
}
