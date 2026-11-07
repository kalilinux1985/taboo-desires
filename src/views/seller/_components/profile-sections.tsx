"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Film, ImageIcon, Images } from "lucide-react";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { ShopCard } from "@/components/shop/shop-grid.tsx";
import PostCard from "@/views/home/_components/post-card.tsx";
import { HEADING_FONT, OUTLINE_ACTION, PANEL } from "../_lib/theme.ts";

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
    <ProfilePanel
      title="Shop"
      count={plural(count, "Listing")}
      action={
        <button type="button" onClick={onViewAll} className={cn(OUTLINE_ACTION, HEADING_FONT, "normal-case text-base")}>
          VIEW ALL LISTINGS
        </button>
      }
    >
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
    </ProfilePanel>
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
    { initialNumItems: 8 },
  );
  return (
    <ProfilePanel
      title="Instant Content"
      count={plural(count, "Item")}
      action={
        <button type="button" onClick={onViewAll} className={cn(OUTLINE_ACTION, HEADING_FONT, "normal-case text-base")}>
          VIEW ALL CONTENT
        </button>
      }
    >
      {status === "LoadingFirstPage" ? (
        <Skeleton className="h-24 w-72" />
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-400">No instant content yet.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {results.map((l) => {
            const kinds = l.lockedKinds ?? [];
            const both = kinds.length > 1;
            const Icon = both ? Images : kinds[0] === "video" ? Film : ImageIcon;
            const label = both ? "Pics & vids" : kinds[0] === "video" ? "Videos" : "Pics";
            return (
              <Link
                key={l._id}
                href={`/listing/${l._id}`}
                title={l.title}
                className="flex w-20 flex-col items-center gap-2 text-center"
              >
                <span className="flex size-20 items-center justify-center rounded-sm bg-[#0d1426] text-violet-500 transition-colors hover:bg-violet-600/20">
                  <Icon className="size-9" strokeWidth={1.5} />
                </span>
                <span className="text-sm font-bold text-slate-200">{label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </ProfilePanel>
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
