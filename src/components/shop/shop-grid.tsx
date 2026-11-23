"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Gavel } from "lucide-react";
import { useEffect, useState } from "react";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { FunctionArgs } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import Countdown from "@/components/countdown.tsx";
import VerifiedBadge from "@/components/verified-badge.tsx";
import FavoriteButton from "@/components/favorite-button.tsx";
import type { ListingCardData } from "@/components/listing-card.tsx";
import { CONDITION_LABEL, formatPrice } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";

export type BrowseArgs = Omit<FunctionArgs<typeof api.listings.browse>, "paginationOpts">;

/** Listing card: photo, seller avatar, name and country, title, description, price. */
export function ShopCard({ listing }: { listing: ListingCardData }) {
  const liveAuction = listing.auction?.status === "live" ? listing.auction : null;
  return (
    <Link
      href={`/listing/${listing._id}`}
      className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[5px] border bg-card shadow-[0_14px_34px_-8px_rgba(0,0,0,0.3)] transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-violet-bright"
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
            <div className="size-full" />
          )}
        </div>
        {listing.condition !== "custom_wear" && (
          <span className="absolute left-3 top-3 rounded-[5px] bg-background/75 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-accent-foreground">
            {CONDITION_LABEL[listing.condition]}
          </span>
        )}
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
        <p className="flex min-w-0 items-center gap-2 text-xs font-extrabold text-violet-600">
          <span className="truncate">{listing.sellerName}</span>
          {listing.sellerCountry && (
            <span className="shrink-0 rounded-[5px] border px-1 font-mono text-[10px] font-bold text-muted-foreground">
              {listing.sellerCountry}
            </span>
          )}
          {listing.sellerVerified && <VerifiedBadge />}
        </p>
        <h3 className="truncate text-base font-extrabold">{listing.title}</h3>
        <p className="line-clamp-2 min-h-[2.6em] text-sm text-muted-foreground">
          {listing.description || [listing.brand, listing.size && `Size ${listing.size}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
        <span className="text-2xl font-extrabold tabular-nums">
          {formatPrice(listing.priceCents)}
          <span className="ml-1 font-mono text-[11px] text-violet-600">USD</span>
        </span>
        {liveAuction ? (
          <span className="flex items-center gap-1.5 rounded-[5px] border border-rose-400 px-3 py-1 text-xs font-extrabold text-red-500">
            <Gavel className="size-3.5" /> {liveAuction.bidCount}{" "}
            {liveAuction.bidCount === 1 ? "bid" : "bids"} ·{" "}
            <Countdown endsAt={liveAuction.endsAt} className="text-red-500" />
          </span>
        ) : (
          <span className="rounded-[5px] bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
            Buy it now
          </span>
        )}
      </div>
    </Link>
  );
}

/** Paginated grid of ShopCards for the given browse arguments (only items for sale). */
export function ShopGrid({
  args,
  filtered,
  onClear,
  className = "sm:grid-cols-2",
}: {
  args: BrowseArgs;
  /** Whether the visitor narrowed the results, for the empty message */
  filtered: boolean;
  onClear: () => void;
  className?: string;
}) {
  const { results, status, loadMore } = usePaginatedQuery(api.listings.browse, args, {
    initialNumItems: 12,
  });

  if (status === "LoadingFirstPage") {
    return (
      <div className={cn("grid gap-6", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-[5px] border bg-card shadow-[0_14px_34px_-8px_rgba(0,0,0,0.3)]">
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
    return (
      <div className="rounded-[5px] border border-dashed px-6 py-14 text-center text-muted-foreground">
        <p>{filtered ? "No listings match these filters." : "Nothing listed here yet."}</p>
        {filtered ? (
          <Button variant="secondary" size="sm" className="mt-4 cursor-pointer" onClick={onClear}>
            Clear filters
          </Button>
        ) : (
          <Button asChild size="sm" className="mt-4 cursor-pointer">
            <Link href="/sell">List the first item</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={cn("grid gap-6", className)}>
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

/** Category page card: photo with the seller's avatar overhanging it, name, title, description, price, bookmark. */
export function CategoryCard({ listing }: { listing: ListingCardData }) {
  const liveAuction = listing.auction?.status === "live" ? listing.auction : null;
  return (
    <Link
      href={`/listing/${listing._id}`}
      className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[5px] border bg-[#141519] shadow-[0_14px_34px_-8px_rgba(0,0,0,0.3)] transition-colors hover:border-violet-bright"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {listing.imageUrl && (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="relative flex flex-1 flex-col px-5 pb-4 pt-9">
        <span className="absolute -top-8 left-5 flex size-16 items-center justify-center overflow-hidden rounded-[5px] bg-muted text-xl font-extrabold">
          {listing.sellerAvatarUrl ? (
            <img src={listing.sellerAvatarUrl} alt="" className="size-full object-cover" />
          ) : (
            listing.sellerName.slice(0, 1).toUpperCase()
          )}
        </span>
        <p className="flex min-w-0 items-center gap-2 text-sm text-violet-600">
          <span className="truncate">{listing.sellerName}</span>
          {listing.sellerVerified && <VerifiedBadge />}
        </p>
        <h3 className="mt-1 truncate text-base">{listing.title}</h3>
        <p className="mt-2 line-clamp-2 min-h-[2.8em] text-sm">
          {listing.description || [listing.brand, listing.size && `Size ${listing.size}`].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="text-2xl text-violet-600 tabular-nums">
            {formatPrice(listing.priceCents)}
            <span className="ml-1 text-sm">USD</span>
          </span>
          <span className="flex items-center gap-3">
            {liveAuction && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <Gavel className="size-3.5" /> {liveAuction.bidCount} · <Countdown endsAt={liveAuction.endsAt} className="text-red-500" />
              </span>
            )}
            <FavoriteButton listingId={listing._id} sellerId={listing.sellerId} variant="bookmark" className="[&_svg]:size-6" />
          </span>
        </div>
      </div>
    </Link>
  );
}

const PAGE_SIZE = 6;

/** Category page results: a bordered two-column grid with Previous / Next below it. */
export function CategoryGrid({
  args,
  filtered,
  onClear,
}: {
  args: BrowseArgs;
  filtered: boolean;
  onClear: () => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(api.listings.browse, args, {
    initialNumItems: PAGE_SIZE * 2,
  });
  const [page, setPage] = useState(0);
  const argsKey = JSON.stringify(args);
  // Back to the first page when the filters or sort change
  useEffect(() => setPage(0), [argsKey]);

  if (status === "LoadingFirstPage") {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-full" />
        ))}
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="rounded-[5px] border border-dashed px-6 py-14 text-center">
        <p>{filtered ? "No listings match these filters." : "Nothing listed here yet."}</p>
        {filtered ? (
          <Button variant="secondary" size="sm" className="mt-4 cursor-pointer" onClick={onClear}>
            Clear filters
          </Button>
        ) : (
          <Button asChild size="sm" className="mt-4 cursor-pointer">
            <Link href="/sell">List the first item</Link>
          </Button>
        )}
      </div>
    );
  }

  const shown = results.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const hasMoreLoaded = (page + 1) * PAGE_SIZE < results.length;
  const canNext = hasMoreLoaded || status === "CanLoadMore" || status === "LoadingMore";
  const next = () => {
    if (!hasMoreLoaded && status === "CanLoadMore") loadMore(PAGE_SIZE * 2);
    setPage((p) => p + 1);
  };
  return (
    <div className="flex flex-col gap-10">
      <div className="rounded-[5px] border bg-[#18191d] p-5 shadow-[0_14px_34px_-8px_rgba(0,0,0,0.3)]">
        {shown.length === 0 ? (
          <div className="flex justify-center py-24">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-x-5 gap-y-12 pt-8 sm:grid-cols-2">
            {shown.map((l) => (
              <CategoryCard key={l._id} listing={l} />
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 rounded-[5px] border border-violet-600">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="h-auto cursor-pointer gap-2 rounded-none border-r border-violet-600 py-4 uppercase tracking-wide hover:bg-violet-600/20"
        >
          <ChevronLeft className="size-5 text-violet-600" /> Previous
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={next}
          disabled={!canNext}
          className="h-auto cursor-pointer gap-2 rounded-none py-4 uppercase tracking-wide hover:bg-violet-600/20"
        >
          Next <ChevronRight className="size-5 text-violet-600" />
        </Button>
      </div>
    </div>
  );
}
