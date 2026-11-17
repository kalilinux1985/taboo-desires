"use client";

import ZoomImage from "@/components/zoom-image.tsx";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Clapperboard, Film, Images, UserRound, type LucideIcon } from "lucide-react";
import { useSearchParams } from "@/lib/navigation.ts";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import type { ListingCardData } from "@/components/listing-card.tsx";
import ProfilePostCard from "./profile-post-card.tsx";
import { CARD, Frame, imagesLabel, SANS, SERIF, SectionTitle } from "../_lib/profile-design.tsx";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const SECTION = "flex flex-col gap-[30px] px-[22px] py-[28px]";
const EMPTY = cn(SANS, "text-sm text-[#ffffff]");

/** A titled section (the full Shop / Instant Content / Photos / Reviews views). */
export function ProfilePanel({ title, count, children }: { title: string; count?: string; children: ReactNode }) {
  return (
    <Frame innerClassName={cn(SECTION, "lg:min-h-[345px]")}>
      <SectionTitle title={title} count={count} />
      {children}
    </Frame>
  );
}

/** Listing card: picture, the seller's square avatar over its bottom-left, name, title, description, price. */
export function ProfileShopCard({ listing }: { listing: ListingCardData }) {
  return (
    <Link href={`/listing/${listing._id}`} className={cn(CARD, SANS, "group flex min-w-0 cursor-pointer flex-col")}>
      <div className="relative aspect-[3/2] overflow-hidden bg-[#f4f4f5]">
        {listing.imageUrl && (
          <img src={listing.imageUrl} alt={listing.title} loading="lazy" className="size-full object-cover" />
        )}
        <span className="absolute -bottom-px left-[14px] flex size-[30px] items-center justify-center overflow-hidden rounded-[2px] bg-[#a8a9ae]">
          {listing.sellerAvatarUrl ? (
            <img src={listing.sellerAvatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="size-6 text-[#2a2a2e]" strokeWidth={1.5} />
          )}
        </span>
      </div>
      <div className="flex min-h-[156px] flex-col px-[15px] pb-4 pt-[18px]">
        <span className="truncate text-[11px] text-[#7b3aec]">{listing.sellerName}</span>
        <h3 className={cn(SERIF, "mt-2.5 truncate text-[15px] text-white group-hover:underline")}>{listing.title}</h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-[18px] text-[#ffffff]">{listing.description}</p>
        <span className="mt-auto pt-4 text-[13px] text-[#7b3aec]">${(listing.priceCents / 100).toFixed(2)} USD</span>
      </div>
    </Link>
  );
}

/** Overview: the two newest listings. The count opens the full shop. */
export function ShopSection({ sellerId, count, onViewAll }: { sellerId: Id<"users">; count: number; onViewAll: () => void }) {
  const { results, status } = usePaginatedQuery(
    api.listings.bySeller,
    { sellerId, status: "active", kind: "items" },
    { initialNumItems: 2 },
  );
  return (
    <Frame innerClassName={SECTION}>
      <SectionTitle title="Shop" count={plural(count, "Listing")} onCount={onViewAll} />
      {status === "LoadingFirstPage" ? (
        <div className="grid gap-[22px] sm:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : results.length === 0 ? (
        <p className={EMPTY}>No listings yet.</p>
      ) : (
        <div className="grid gap-[22px] sm:grid-cols-2">
          {results.slice(0, 2).map((l) => (
            <ProfileShopCard key={l._id} listing={l} />
          ))}
        </div>
      )}
    </Frame>
  );
}

/** A square Instant Content tile: the item's preview picture, or its media icon. */
function ContentTile({ href, title, icon: Icon, imageUrl }: { href: string; title: string; icon: LucideIcon; imageUrl: string | null }) {
  return (
    <Link
      href={href}
      title={title}
      className={cn(CARD, "group flex size-[110px] shrink-0 cursor-pointer items-center justify-center overflow-hidden text-[#7b3aec]")}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <Icon className="size-10" strokeWidth={1.5} />
      )}
    </Link>
  );
}

/** Overview: Instant Content tiles. The count opens the full list. */
export function InstantSection({ sellerId, count, onViewAll }: { sellerId: Id<"users">; count: number; onViewAll: () => void }) {
  const { results, status } = usePaginatedQuery(
    api.listings.bySeller,
    { sellerId, status: "active", kind: "instant" },
    { initialNumItems: 6 },
  );
  return (
    <Frame innerClassName={SECTION}>
      <SectionTitle title="Instant Content" count={plural(count, "Item")} onCount={onViewAll} />
      {status === "LoadingFirstPage" ? (
        <div className="flex gap-[18px]">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="size-[110px]" />)}
        </div>
      ) : results.length === 0 ? (
        <p className={EMPTY}>No instant content yet.</p>
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
    </Frame>
  );
}

/** Overview: the newest photos (profile photos and post photos). The count opens the Photos tab. */
export function PhotosSection({ userId, count, onViewAll }: { userId: Id<"users">; count: number; onViewAll: () => void }) {
  const { results, status } = usePaginatedQuery(api.users.photosByUser, { userId }, { initialNumItems: 6 });
  return (
    <Frame innerClassName={SECTION}>
      <SectionTitle title="Photos" count={imagesLabel(count)} onCount={onViewAll} />
      {status === "LoadingFirstPage" ? (
        <div className="flex gap-[18px]">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="size-[110px]" />)}
        </div>
      ) : results.length === 0 ? (
        <p className={EMPTY}>No photos yet.</p>
      ) : (
        <div className="flex flex-wrap gap-[18px]">
          {results.slice(0, 6).map((p) => (
            <ZoomImage key={p._id} src={p.url} className="group size-[110px] overflow-hidden">
              <img
                src={p.url}
                alt=""
                loading="lazy"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </ZoomImage>
          ))}
        </div>
      )}
    </Frame>
  );
}

/** Overview: the member's own posts, each with its comments. */
export function ActivitySection({ authorId }: { authorId: Id<"users"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.feed,
    { filter: "all", sort: "newest", authorId },
    { initialNumItems: 3 },
  );
  // From a notification: ?post=<id> (and &comments=1) scrolls to that post, loading more until it's there
  const [params] = useSearchParams();
  const target = params.get("post");
  const openComments = params.get("comments") === "1";
  const found = !!target && results.some((r) => r._id === target);
  useEffect(() => {
    if (target && !found && status === "CanLoadMore") loadMore(10);
  }, [target, found, status, loadMore]);
  return (
    <Frame innerClassName={SECTION}>
      <SectionTitle title="Latest Activity" />
      {status === "LoadingFirstPage" ? (
        <Skeleton className="h-64 w-full" />
      ) : results.length === 0 ? (
        <p className={EMPTY}>No posts yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-[#252b37]">
          {results.map((item) => (
            <ProfilePostCard key={item._id} item={item} focus={item._id === target ? { comments: openComments } : undefined} />
          ))}
          {(status === "CanLoadMore" || status === "LoadingMore") && (
            <Button
              variant="ghost"
              onClick={() => loadMore(3)}
              disabled={status === "LoadingMore"}
              className={cn(SERIF, "cursor-pointer self-center text-[#7b3aec]")}
            >
              {status === "LoadingMore" && <Spinner />} Show more activity
            </Button>
          )}
        </div>
      )}
    </Frame>
  );
}
