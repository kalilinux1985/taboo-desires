import Link from "next/link";
import type { PaginationStatus } from "@/lib/backend/react.tsx";
import { Gavel, Lock, PackageOpen } from "lucide-react";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import { api } from "@/lib/backend/api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { CONDITION_LABEL, formatPrice } from "@/lib/listings.ts";
import Countdown from "@/components/countdown.tsx";
import AccountBadge from "@/components/account-badge.tsx";
import VerifiedBadge from "@/components/verified-badge.tsx";
import FavoriteButton from "@/components/favorite-button.tsx";
import type { ReactNode } from "react";

export type ListingCardData = FunctionReturnType<
  typeof api.listings.browse
>["page"][number];

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const liveAuction = listing.auction?.status === "live" ? listing.auction : null;
  return (
    <Link
      href={`/listing/${listing._id}`}
      className="group flex cursor-pointer flex-col gap-2"
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        {listing.imageUrl && (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {listing.status !== "active" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <span className="font-display text-3xl text-white">
              {listing.status === "sold" ? "Sold" : "Unsold"}
            </span>
          </div>
        )}
        <Badge className="absolute left-2 top-2 rounded-sm bg-background/90 text-foreground uppercase tracking-wide">
          {CONDITION_LABEL[listing.condition]}
        </Badge>
        <FavoriteButton
          listingId={listing._id}
          sellerId={listing.sellerId}
          className="absolute right-2 top-2"
        />
        {listing.isLocked && listing.status === "active" && (
          <span className="absolute right-12 top-2 flex size-8 items-center justify-center rounded-full text-violet-600 drop-shadow-md">
            <Lock className="size-4" />
          </span>
        )}
        {liveAuction && (
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-sm bg-primary px-2 py-1 text-xs font-bold uppercase text-primary-foreground">
            <span className="flex items-center gap-1">
              <Gavel className="size-3.5" /> {liveAuction.bidCount}{" "}
              {liveAuction.bidCount === 1 ? "bid" : "bids"}
            </span>
            <Countdown endsAt={liveAuction.endsAt} className="text-primary-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {listing.brand}
          </p>
          <p className="shrink-0 font-mono text-sm font-bold">
            {formatPrice(listing.priceCents)}
            {liveAuction && (
              <span className="pl-1 font-sans text-[10px] font-semibold uppercase text-muted-foreground">
                bid
              </span>
            )}
          </p>
        </div>
        <p className="truncate font-medium">{listing.title}</p>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">
            Size {listing.size} · {listing.sellerName}
          </span>
          {listing.sellerVerified && <VerifiedBadge />}
          <AccountBadge kind="seller" className="px-1.5 py-0 text-[9px]" />
        </p>
      </div>
    </Link>
  );
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

type PaginatedListings = {
  results: ListingCardData[];
  status: PaginationStatus;
  loadMore: (numItems: number) => void;
};

/** Renders a paginated listing result with loading, empty, and load-more states. */
export function ListingGrid({
  query,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  query: PaginatedListings;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
}) {
  const { results, status, loadMore } = query;
  if (status === "LoadingFirstPage") return <ListingGridSkeleton />;
  return (
    <div className="flex flex-col gap-8">
      {results.length === 0 && status === "Exhausted" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageOpen />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
          {emptyAction}
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {results.map((l) => (
            <ListingCard key={l._id} listing={l} />
          ))}
        </div>
      )}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => loadMore(24)}
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
