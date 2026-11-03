import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Gavel,
  ShoppingBag,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import Countdown from "@/components/countdown.tsx";
import VerifiedBadge from "@/components/verified-badge.tsx";
import FavoriteButton from "@/components/favorite-button.tsx";
import type { ListingCardData } from "@/components/listing-card.tsx";
import {
  CATEGORIES,
  CONDITIONS,
  CONDITION_LABEL,
  formatPrice,
  type Category,
  type Condition,
} from "@/lib/listings.ts";
import { SELLER_DETAIL_FIELDS } from "@/shared/sellerDetails.ts";
import { cn } from "@/lib/utils.ts";

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

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

type Option = { value: string; label: string };
type Group = { key: string; label: string; options: Option[]; multi: boolean };

const asOptions = (values: readonly string[]): Option[] =>
  values.map((x) => ({ value: x, label: x }));

/** Seller-profile fields shown as filters, in the order buyers care most about. */
const SELLER_FILTER_KEYS = [
  "ageRange",
  "ethnicity",
  "showFace",
  "bodySize",
  "shoeSize",
  "occupation",
  "gender",
  "country",
  "tattoos",
  "piercings",
  "hairColor",
  "eyeColor",
  "smokes",
  "drinks",
  "height",
  "relationshipStatus",
] as const;

const SELLER_KEYS = new Set<string>(SELLER_FILTER_KEYS);

const GROUPS: Group[] = [
  { key: "category", label: "Category", options: CATEGORIES, multi: false },
  { key: "saleType", label: "Buy it now", options: [...SALE_TYPES], multi: false },
  { key: "price", label: "Price", options: [...PRICE_BANDS], multi: false },
  { key: "condition", label: "Wear time", options: CONDITIONS, multi: false },
  { key: "verified", label: "Verified", options: [{ value: "yes", label: "Verified sellers only" }], multi: false },
  { key: "listed", label: "Listed date", options: [...LISTED], multi: false },
  ...SELLER_FILTER_KEYS.map((key) => {
    const field = SELLER_DETAIL_FIELDS.find((f) => f.key === key)!;
    return {
      key,
      label: field.label.replace(" (US)", ""),
      options: asOptions(field.options),
      multi: true,
    };
  }),
];

type Selection = Record<string, string[]>;

function toArgs(sel: Selection) {
  const one = (key: string) => sel[key]?.[0];
  const band = PRICE_BANDS.find((b) => b.value === one("price"));
  const listed = one("listed");
  const seller = Object.entries(sel)
    .filter(([key, values]) => SELLER_KEYS.has(key) && values.length > 0)
    .map(([key, values]) => ({ key, values }));
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
        <Accordion type="multiple" defaultValue={["category", "saleType", "price"]}>
          {GROUPS.map((group) => {
            const chosen = selection[group.key] ?? [];
            return (
              <AccordionItem key={group.key} value={group.key}>
                <AccordionTrigger className="cursor-pointer py-3 font-bold hover:no-underline [&>svg]:text-violet-400">
                  <span>
                    {group.label}
                    {chosen.length > 0 && (
                      <span className="ml-2 rounded-full bg-violet-400 px-1.5 font-mono text-[11px] text-background">
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
                          "cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                          on
                            ? "border-violet-600 bg-primary text-primary-foreground"
                            : "bg-card text-muted-foreground hover:border-violet-400/50 hover:text-foreground",
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
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Listing cards
// ---------------------------------------------------------------------------

function ShopCard({ listing }: { listing: ListingCardData }) {
  const liveAuction = listing.auction?.status === "live" ? listing.auction : null;
  return (
    <Link
      to={`/listing/${listing._id}`}
      className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-sm border bg-card transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-violet-400/45"
    >
      <div className="relative aspect-[5/3] bg-muted">
        <div className="absolute inset-0 overflow-hidden">
          {listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="size-full bg-gradient-to-br from-violet-900 to-indigo-950" />
          )}
        </div>
        <span className="absolute left-3 top-3 rounded-sm bg-background/75 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-accent-foreground">
          {CONDITION_LABEL[listing.condition]}
        </span>
        <FavoriteButton
          listingId={listing._id}
          sellerId={listing.sellerId}
          className="absolute right-2 top-2"
        />
        <span className="absolute -bottom-7 right-4 flex size-14 items-center justify-center overflow-hidden rounded-full border-[3px] border-card bg-primary text-lg font-extrabold text-primary-foreground shadow-lg">
          {listing.sellerAvatarUrl ? (
            <img src={listing.sellerAvatarUrl} alt="" className="size-full object-cover" />
          ) : (
            listing.sellerName.slice(0, 1).toUpperCase()
          )}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 pr-20">
        <p className="flex min-w-0 items-center gap-2 text-xs font-extrabold text-violet-400">
          <span className="truncate">{listing.sellerName}</span>
          {listing.sellerCountry && (
            <span className="shrink-0 rounded-sm border px-1 font-mono text-[10px] font-bold text-muted-foreground">
              {listing.sellerCountry}
            </span>
          )}
          {listing.sellerVerified && <VerifiedBadge />}
        </p>
        <h3 className="truncate text-base font-extrabold">{listing.title}</h3>
        <p className="line-clamp-2 min-h-[2.6em] text-sm text-muted-foreground">
          {listing.description || `${listing.brand} · Size ${listing.size}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
        <span className="text-2xl font-extrabold tabular-nums">
          {formatPrice(listing.priceCents)}
          <span className="ml-1 font-mono text-[11px] text-violet-400">USD</span>
        </span>
        {liveAuction ? (
          <span className="flex items-center gap-1.5 rounded-full border border-rose-400 px-3 py-1 text-xs font-extrabold text-rose-400">
            <Gavel className="size-3.5" /> {liveAuction.bidCount}{" "}
            {liveAuction.bidCount === 1 ? "bid" : "bids"} ·{" "}
            <Countdown endsAt={liveAuction.endsAt} className="text-rose-400" />
          </span>
        ) : (
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
            Buy it now
          </span>
        )}
      </div>
    </Link>
  );
}

function ShopGrid({ selection, onClear }: { selection: Selection; onClear: () => void }) {
  const args = useMemo(() => toArgs(selection), [selection]);
  const { results, status, loadMore } = usePaginatedQuery(api.listings.browse, args, {
    initialNumItems: 12,
  });

  if (status === "LoadingFirstPage") {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-sm border bg-card">
            <Skeleton className="aspect-[5/3] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    const filtered = Object.values(selection).some((v) => v.length);
    return (
      <div className="rounded-sm border border-dashed px-6 py-14 text-center text-muted-foreground">
        <p>{filtered ? "No listings match these filters." : "No listings yet."}</p>
        {filtered ? (
          <Button variant="secondary" size="sm" className="mt-4 cursor-pointer" onClick={onClear}>
            Clear filters
          </Button>
        ) : (
          <Button asChild size="sm" className="mt-4 cursor-pointer">
            <Link to="/sell">List the first item</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {results.map((l) => (
          <ShopCard key={l._id} listing={l} />
        ))}
      </div>
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => loadMore(12)}
            disabled={status === "LoadingMore"}
            className="cursor-pointer"
          >
            {status === "LoadingMore" && <Spinner />} Load more
          </Button>
        </div>
      )}
    </div>
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
        to={to}
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
          to="/browse"
          className="cursor-pointer text-sm font-semibold uppercase tracking-wider underline-offset-4 hover:underline"
        >
          Search all
        </Link>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <FilterPanel selection={selection} onToggle={toggle} onClear={clear} />
        <ShopGrid selection={selection} onClear={clear} />
      </div>

      <Link
        to="/signin"
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
