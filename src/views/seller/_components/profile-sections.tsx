"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Clapperboard, Film, Images, UserRound, type LucideIcon } from "lucide-react";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import type { ListingCardData } from "@/components/listing-card.tsx";
import ProfilePostCard from "./profile-post-card.tsx";
import { HEADING_FONT, INSET, PANEL } from "../_lib/theme.ts";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Section heading of the design: white serif title, small violet count, and a
 * short violet underline. `onCount` makes the count open the full list.
 */
function SectionHeading({
  title,
  count,
  onCount,
  fancy = false,
}: {
  title: string;
  count?: string;
  onCount?: () => void;
  /** "Latest Activity" uses the old-style serif */
  fancy?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <h2 className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
        <span className={cn(fancy ? cn(HEADING_FONT, "text-[27px] text-[#ccd5e4]") : "text-[22px] text-white")}>
          {title}
        </span>
        {count &&
          (onCount ? (
            <button
              type="button"
              onClick={onCount}
              className="cursor-pointer text-[13px] text-violet-600 hover:underline"
            >
              {count}
            </button>
          ) : (
            <span className="text-[13px] text-violet-600">{count}</span>
          ))}
      </h2>
      <span className="h-0.5 w-[50px] bg-violet-600" />
    </div>
  );
}

/** A titled panel (used by the full Shop / Instant Content / Photos / Reviews views). */
export function ProfilePanel({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(PANEL, "flex flex-col gap-5 p-5 sm:px-[26px] sm:py-[22px]")}>
      <SectionHeading title={title} count={count} />
      {children}
    </section>
  );
}

/** Listing card of the design: picture, the seller's square avatar over its bottom-left, name, title, description, price. */
function ProfileShopCard({ listing }: { listing: ListingCardData }) {
  return (
    <Link href={`/listing/${listing._id}`} className={cn(INSET, "group flex min-w-0 cursor-pointer flex-col")}>
      <div className="relative aspect-[3/2] bg-[#f4f4f5]">
        {listing.imageUrl && (
          <img src={listing.imageUrl} alt={listing.title} loading="lazy" className="size-full object-cover" />
        )}
        <span className="absolute -bottom-px left-[14px] flex size-[30px] items-center justify-center overflow-hidden rounded-[1px] bg-[#a8a9ae]">
          {listing.sellerAvatarUrl ? (
            <img src={listing.sellerAvatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="size-6 text-[#2a2a2e]" strokeWidth={1.5} />
          )}
        </span>
      </div>
      <div className="flex min-h-[156px] flex-col px-[15px] pb-4 pt-[18px]">
        <span className="truncate text-[11px] text-violet-600">{listing.sellerName}</span>
        <h3 className="mt-2.5 truncate text-[13px] text-white group-hover:underline">{listing.title}</h3>
        <p className="mt-2 line-clamp-2 text-[12px] leading-[18px] text-white">{listing.description}</p>
        <span className="mt-auto pt-4 text-[12px] text-violet-600">
          ${(listing.priceCents / 100).toFixed(2)} USD
        </span>
      </div>
    </Link>
  );
}

/** Overview: the two newest listings. The count opens the full shop. */
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
    <section className={cn(PANEL, "flex flex-col gap-[22px] px-5 py-6 sm:px-[26px]")}>
      <SectionHeading title="Shop" count={plural(count, "Listing")} onCount={onViewAll} />
      {status === "LoadingFirstPage" ? (
        <div className="grid gap-[22px] sm:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-400">No listings yet.</p>
      ) : (
        <div className="grid gap-[22px] sm:grid-cols-2">
          {results.slice(0, 2).map((l) => (
            <ProfileShopCard key={l._id} listing={l} />
          ))}
        </div>
      )}
    </section>
  );
}

/** A square Instant Content tile: the item's preview picture, or its media icon. */
function ContentTile({
  href,
  title,
  icon: Icon,
  imageUrl,
}: {
  href: string;
  title: string;
  icon: LucideIcon;
  imageUrl: string | null;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="group flex size-[73px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[1px] border border-white/25 bg-[#030917]/50 text-violet-600 shadow-[0_14px_34px_-8px_rgba(0,0,0,0.3)]"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <Icon className="size-9" strokeWidth={1.5} />
      )}
    </Link>
  );
}

/** Overview: Instant Content in a card inside the card. The count opens the full list. */
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
    <section className={cn(PANEL, "p-[18px]")}>
      <div className={cn(INSET, "flex flex-col gap-5 px-[22px] py-[22px]")}>
        <SectionHeading title="Instant Content" count={plural(count, "Item")} onCount={onViewAll} />
        {status === "LoadingFirstPage" ? (
          <div className="flex gap-[18px]">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="size-[73px]" />)}
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-slate-400">No instant content yet.</p>
        ) : (
          <div className="flex flex-wrap gap-[18px]">
            {results.map((l) => {
              const kinds = l.lockedKinds ?? [];
              const both = kinds.length > 1;
              const video = !both && kinds[0] === "video";
              return (
                <ContentTile
                  key={l._id}
                  href={`/listing/${l._id}`}
                  title={l.title}
                  icon={both ? Clapperboard : video ? Film : Images}
                  imageUrl={l.imageUrl ?? null}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/** Overview: the newest photos (profile photos and post photos). The count opens the Photos tab. */
export function PhotosSection({
  userId,
  count,
  onViewAll,
}: {
  userId: Id<"users">;
  count: number;
  onViewAll: () => void;
}) {
  const { results, status } = usePaginatedQuery(api.users.photosByUser, { userId }, { initialNumItems: 6 });
  return (
    <section className={cn(PANEL, "p-[18px]")}>
      <div className={cn(INSET, "flex flex-col gap-5 px-[22px] py-[22px]")}>
        <SectionHeading title="Photos" count={plural(count, "Image")} onCount={onViewAll} />
        {status === "LoadingFirstPage" ? (
          <div className="grid grid-cols-3 gap-[18px]">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-square" />)}
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-slate-400">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-[18px]">
            {results.slice(0, 6).map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={onViewAll}
                aria-label="Open photos"
                className="group aspect-square cursor-pointer overflow-hidden rounded-[1px] border border-white/25 bg-[#030917]/50 shadow-[0_14px_34px_-8px_rgba(0,0,0,0.3)]"
              >
                <img
                  src={p.url}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** The profile tabs: a bar of buttons in an inner card; the open tab is violet. */
export function ProfileTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <nav aria-label="Profile sections" className={cn(PANEL, "p-[18px]")}>
      <div className={cn(INSET, "flex flex-wrap gap-2.5 px-3 py-3 sm:gap-3")}>
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-current={value === t.value ? "page" : undefined}
            onClick={() => onChange(t.value)}
            className={cn(
              "h-[30px] cursor-pointer rounded-[1px] border px-4 text-[13px] transition-colors",
              value === t.value
                ? "border-violet-600 bg-violet-600 font-bold text-white"
                : "border-white/25 bg-[#030917]/50 text-white hover:bg-violet-600",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** Overview: the member's own posts, each with its comments. */
export function ActivitySection({ authorId }: { authorId: Id<"users"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.feed,
    { filter: "all", sort: "newest", authorId },
    { initialNumItems: 3 },
  );
  return (
    <section className={cn(PANEL, "flex flex-col gap-7 px-5 py-6 sm:px-[26px]")}>
      <SectionHeading title="Latest Activity" fancy />
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
    </section>
  );
}
