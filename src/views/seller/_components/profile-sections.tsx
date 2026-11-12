"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Clapperboard, Film, Images, type LucideIcon } from "lucide-react";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import FavoriteButton from "@/components/favorite-button.tsx";
import type { ListingCardData } from "@/components/listing-card.tsx";
import ProfilePostCard from "./profile-post-card.tsx";
import { HEADING_FONT, PANEL } from "../_lib/theme.ts";

const PANEL_CLASS = cn(PANEL, "flex flex-col gap-5 p-5 sm:px-[26px] sm:py-[22px]");

/** Outlined violet action on the right of a heading ("VIEW ALL LISTINGS"). */
const VIEW_ALL =
  "inline-flex h-[27px] shrink-0 cursor-pointer items-center justify-center rounded-[1px] border-2 border-violet-600 px-4 text-[13px] uppercase tracking-tight text-violet-600 transition-colors hover:bg-violet-600 hover:text-white";

/** Heading of a profile panel: title, optional violet count, short violet underline. */
function PanelHeading({ title, count, size = "md" }: { title: string; count?: string; size?: "md" | "lg" }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h2 className={cn(HEADING_FONT, "flex flex-wrap items-baseline gap-x-3 leading-none")}>
        <span className={cn("text-[#cbd5e1]", size === "lg" ? "text-[28px]" : "text-[23px]")}>{title}</span>
        {count && (
          <span className="text-[17px] text-violet-600 [text-shadow:0_0_10px_rgba(124,58,237,0.55)]">{count}</span>
        )}
      </h2>
      <span className="h-0.5 w-12 bg-violet-600" />
    </div>
  );
}

/** A titled panel: heading with a violet underline, optional count and action. */
export function ProfilePanel({
  title,
  count,
  action,
  size,
  children,
}: {
  title: string;
  count?: string;
  action?: ReactNode;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  return (
    <section className={PANEL_CLASS}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between [&>button]:w-full [&>button]:justify-center sm:[&>button]:w-auto">
        <PanelHeading title={title} count={count} size={size} />
        {action}
      </div>
      {children}
    </section>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** An Overview section: title and count on the left, "View All" on the right, then the preview. */
function OverviewPanel({
  title,
  count,
  viewAll,
  onViewAll,
  children,
}: {
  title: string;
  count: string;
  viewAll: string;
  onViewAll: () => void;
  children: ReactNode;
}) {
  return (
    <section className={PANEL_CLASS}>
      <div className="flex items-start justify-between gap-3">
        <PanelHeading title={title} count={count} />
        <button type="button" onClick={onViewAll} className={cn(HEADING_FONT, VIEW_ALL)}>
          {viewAll}
        </button>
      </div>
      {children}
    </section>
  );
}

/** Listing card of the profile design: photo, seller avatar, name, title, text, price and save. */
function ProfileShopCard({ listing }: { listing: ListingCardData }) {
  return (
    <Link
      href={`/listing/${listing._id}`}
      className="group flex min-w-0 cursor-pointer flex-col rounded-[1px] bg-[#040a18] shadow-[0_14px_28px_-6px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[3/2] rounded-t-[1px] bg-[#808185]">
        <div className="absolute inset-0 overflow-hidden rounded-t-[1px]">
          {listing.imageUrl && (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
        </div>
        <span className="absolute -bottom-2 right-[15px] flex size-[50px] items-center justify-center overflow-hidden rounded-full border-[3px] border-violet-600 bg-[#c8c8cc] text-lg font-bold text-white">
          {listing.sellerAvatarUrl ? (
            <img src={listing.sellerAvatarUrl} alt="" className="size-full object-cover" />
          ) : (
            listing.sellerName.slice(0, 1).toUpperCase()
          )}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-[14px] pb-[14px] pt-[14px]">
        <p className="truncate pr-14 text-[13px] text-[#7b3aec]">{listing.sellerName}</p>
        <h3 className="mt-2 truncate text-base font-bold text-white">{listing.title}</h3>
        <p className="mt-1 line-clamp-2 min-h-9 text-[11px] leading-[18px] text-[#fefefe]">
          {listing.description || `${listing.brand} · Size ${listing.size}`}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[13px] text-[#7b3aec]">${(listing.priceCents / 100).toFixed(2)} USD</span>
          <FavoriteButton listingId={listing._id} sellerId={listing.sellerId} variant="bookmark" />
        </div>
      </div>
    </Link>
  );
}

/** Overview: two newest listings. */
export function ShopSection({
  sellerId,
  count,
  onViewAll,
}: {
  sellerId: Id<"users">;
  count: number;
  onViewAll: () => void;
}) {
  const { results, status } = usePaginatedQuery(
    api.listings.bySeller,
    { sellerId, status: "active", kind: "items" },
    { initialNumItems: 2 },
  );
  return (
    <OverviewPanel title="Shop" count={plural(count, "Listing")} viewAll="View All Listings" onViewAll={onViewAll}>
      {status === "LoadingFirstPage" ? (
        <div className="grid gap-[26px] sm:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-400">No listings yet.</p>
      ) : (
        <div className="grid gap-[26px] sm:grid-cols-2">
          {results.slice(0, 2).map((l) => (
            <ProfileShopCard key={l._id} listing={l} />
          ))}
        </div>
      )}
    </OverviewPanel>
  );
}

/**
 * A small square tile: the item's preview picture (the blurred public preview of
 * the locked content) with its media icon in the corner, or just the icon when
 * there's no picture; the label ("Pics", "Videos") underneath.
 */
function ContentTile({
  href,
  title,
  icon: Icon,
  label,
  imageUrl,
}: {
  href: string;
  title: string;
  icon: LucideIcon;
  label: string;
  imageUrl: string | null;
}) {
  return (
    <Link href={href} title={title} className="group flex w-[73px] cursor-pointer flex-col items-center gap-2.5">
      <span className="relative flex size-[73px] items-center justify-center overflow-hidden rounded-[1px] bg-[#040a18] text-[#7b3aec] shadow-[0_12px_22px_-6px_rgba(0,0,0,0.45)] transition-colors group-hover:bg-violet-600/15">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-[1px] bg-[#040a18]/85">
              <Icon className="size-3.5" strokeWidth={1.75} />
            </span>
          </>
        ) : (
          <Icon className="size-9" strokeWidth={1.5} />
        )}
      </span>
      <span className="text-center text-xs font-bold text-[#f3f5f4]">{label}</span>
    </Link>
  );
}

/** Overview: Instant Content tiles, labelled by the media they unlock. */
export function InstantSection({
  sellerId,
  count,
  onViewAll,
}: {
  sellerId: Id<"users">;
  count: number;
  onViewAll: () => void;
}) {
  const { results, status } = usePaginatedQuery(
    api.listings.bySeller,
    { sellerId, status: "active", kind: "instant" },
    { initialNumItems: 6 },
  );
  return (
    <OverviewPanel title="Instant Content" count={plural(count, "Item")} viewAll="View All Content" onViewAll={onViewAll}>
      {status === "LoadingFirstPage" ? (
        <div className="flex gap-[13px]">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="size-[73px]" />)}
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-400">No instant content yet.</p>
      ) : (
        <div className="flex flex-wrap gap-x-[13px] gap-y-4">
          {results.slice(0, 6).map((l) => {
            const kinds = l.lockedKinds ?? [];
            const both = kinds.length > 1;
            const video = !both && kinds[0] === "video";
            return (
              <ContentTile
                key={l._id}
                href={`/listing/${l._id}`}
                title={l.title}
                icon={both ? Clapperboard : video ? Film : Images}
                label={both ? "Pics & Vids" : video ? "Videos" : "Pics"}
                imageUrl={l.imageUrl ?? null}
              />
            );
          })}
        </div>
      )}
    </OverviewPanel>
  );
}

/** Overview: the member's own posts with likes and comments. */
export function ActivitySection({ authorId }: { authorId: Id<"users"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.feed,
    { filter: "all", sort: "newest", authorId },
    { initialNumItems: 3 },
  );
  return (
    <ProfilePanel title="Latest Activity" size="lg">
      {status === "LoadingFirstPage" ? (
        <Skeleton className="h-64 w-full" />
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-400">No posts yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {results.map((item) => (
            <ProfilePostCard key={item._id} item={item} />
          ))}
          {(status === "CanLoadMore" || status === "LoadingMore") && (
            <Button
              variant="ghost"
              onClick={() => loadMore(3)}
              disabled={status === "LoadingMore"}
              className="cursor-pointer self-center text-violet-600"
            >
              {status === "LoadingMore" && <Spinner />} Show more activity
            </Button>
          )}
        </div>
      )}
    </ProfilePanel>
  );
}
