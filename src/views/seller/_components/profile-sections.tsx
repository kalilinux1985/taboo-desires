"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ImageIcon, Images, Video } from "lucide-react";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { ShopCard } from "@/components/shop/shop-grid.tsx";
import PostCard from "@/views/home/_components/post-card.tsx";
import { HEADING_FONT, PANEL } from "../_lib/theme.ts";

/** A titled panel: heading with a violet underline, optional count and action. */
export function ProfilePanel({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn(PANEL, "flex flex-col gap-5 p-5 sm:p-6")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between [&>button]:w-full [&>button]:justify-center sm:[&>button]:w-auto">
        <h2 className={cn(HEADING_FONT, "flex items-baseline gap-3 text-3xl")}>
          <span className="border-b-2 border-violet-600 pb-0.5">{title}</span>
          {count && <span className="text-lg text-violet-500">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * An Overview section: title with its count, a short violet underline, then a
 * full-width "View All" button above the preview.
 */
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
    <section className={cn(PANEL, "flex flex-col gap-5 p-5 sm:p-6")}>
      <div className="flex flex-col gap-3">
        <h2 className={cn(HEADING_FONT, "flex flex-wrap items-baseline gap-x-2.5 text-3xl font-bold")}>
          {title}
          <span className="text-2xl font-normal text-violet-400">{count}</span>
        </h2>
        <span className="h-0.5 w-16 bg-violet-600" />
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="w-full cursor-pointer rounded-full border-2 border-violet-600 py-2 text-sm font-bold text-violet-400 transition-colors hover:bg-violet-600 hover:text-white"
      >
        {viewAll}
      </button>
      {children}
    </section>
  );
}

/** A square thumbnail with a small label underneath ("Vid", "Pics"). */
function Tile({
  href,
  onClick,
  title,
  imageUrl,
  icon: Icon,
  label,
}: {
  href?: string;
  onClick?: () => void;
  title?: string;
  imageUrl: string | null;
  icon?: typeof ImageIcon;
  label?: string;
}) {
  const body = (
    <>
      <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-sm bg-[#0d1426] text-violet-500">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          Icon && <Icon className="size-9" strokeWidth={1.5} />
        )}
      </span>
      {label && Icon && (
        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-200">
          <Icon className="size-4 text-slate-300" /> {label}
        </span>
      )}
    </>
  );
  const className = "group flex min-w-0 cursor-pointer flex-col items-center gap-2";
  return href ? (
    <Link href={href} title={title} className={className}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} title={title} className={className}>{body}</button>
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
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-400">No listings yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {results.slice(0, 2).map((l) => (
            <ShopCard key={l._id} listing={l} />
          ))}
        </div>
      )}
    </OverviewPanel>
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
    <OverviewPanel
      title="Instant Content"
      count={plural(count, "Item")}
      viewAll="View All Content"
      onViewAll={onViewAll}
    >
      {status === "LoadingFirstPage" ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-400">No instant content yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-4">
          {results.slice(0, 6).map((l) => {
            const kinds = l.lockedKinds ?? [];
            const both = kinds.length > 1;
            const video = !both && kinds[0] === "video";
            return (
              <Tile
                key={l._id}
                href={`/listing/${l._id}`}
                title={l.title}
                imageUrl={l.imageUrl ?? null}
                icon={both ? Images : video ? Video : ImageIcon}
                label={both ? "Pics & Vids" : video ? "Vid" : "Pics"}
              />
            );
          })}
        </div>
      )}
    </OverviewPanel>
  );
}

/** Overview: the member's profile photos. */
export function PhotosSection({
  photos,
  onViewAll,
}: {
  photos: { _id: string; url: string }[];
  onViewAll: () => void;
}) {
  return (
    <OverviewPanel title="Photos" count={plural(photos.length, "image")} viewAll="View All Images" onViewAll={onViewAll}>
      {photos.length === 0 ? (
        <p className="text-sm text-slate-400">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {photos.slice(0, 6).map((p) => (
            <Tile key={p._id} onClick={onViewAll} imageUrl={p.url} />
          ))}
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
    <ProfilePanel title="Latest Activity">
      {status === "LoadingFirstPage" ? (
        <Skeleton className="h-64 w-full" />
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-400">No posts yet.</p>
      ) : (
        <div className="flex flex-col">
          {results.map((item) => (
            <PostCard key={item._id} item={item} online={false} />
          ))}
          {(status === "CanLoadMore" || status === "LoadingMore") && (
            <Button
              variant="ghost"
              onClick={() => loadMore(3)}
              disabled={status === "LoadingMore"}
              className="cursor-pointer self-center text-violet-400"
            >
              {status === "LoadingMore" && <Spinner />} Show more activity
            </Button>
          )}
        </div>
      )}
    </ProfilePanel>
  );
}
