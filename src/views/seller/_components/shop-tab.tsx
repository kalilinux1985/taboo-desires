"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ImageIcon, ShieldCheck, Star, UserRound } from "lucide-react";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import FavoriteButton from "@/components/favorite-button.tsx";
import type { ListingCardData } from "@/components/listing-card.tsx";
import { CATEGORIES, type Category } from "@/lib/listings.ts";
import { CARD, SANS, SERIF } from "../_lib/profile-design.tsx";

/** Compact header of the Shop tab: small picture, name, rating and ID Verified. */
export function ShopHeader({
  name,
  avatarUrl,
  rating,
  reviewCount,
  verified,
  onReviews,
}: {
  name: string;
  avatarUrl: string | null;
  rating: number | null;
  reviewCount: number;
  verified: boolean;
  onReviews: () => void;
}) {
  return (
    <div className="flex items-center gap-[23px]">
      <div className="flex size-[115px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#a8a9ae]">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="size-full object-cover" />
        ) : (
          <UserRound className="size-[92px] text-[#2a2a2e]" strokeWidth={1.25} />
        )}
      </div>
      <div className="min-w-0">
        <h1 className={cn(SERIF, "truncate text-[22px] leading-tight text-white")}>{name}</h1>
        <p className={cn(SERIF, "mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white")}>
          <Button variant="plain" size="none" type="button" onClick={onReviews} className="flex cursor-pointer items-center gap-1.5 hover:underline">
            <Star className="size-3.5 text-[#7b3aec]" strokeWidth={1.75} />
            {(rating ?? 0).toFixed(1)} ({reviewCount})
          </Button>
          {verified && (
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-[#7b3aec]" strokeWidth={1.75} /> ID Verified
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/** One shop listing: picture, the seller's avatar over its bottom-left, name, title, description, price, bookmark. */
function ShopCard({ listing }: { listing: ListingCardData }) {
  return (
    <div className={cn(CARD, "relative flex min-w-0 flex-col overflow-hidden bg-[#141519]")}>
      <Link href={`/listing/${listing._id}`} className="group flex flex-1 cursor-pointer flex-col">
        <div className="relative aspect-[1.68] overflow-hidden bg-white">
          {listing.imageUrl ? (
            <img src={listing.imageUrl} alt={listing.title} loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageIcon className="size-[55%] text-[#8a9199]" strokeWidth={1.1} />
            </div>
          )}
          <span className="absolute -bottom-[11px] left-[20px] flex size-[44px] items-center justify-center overflow-hidden rounded-[5px] bg-[#a8a9ae]">
            {listing.sellerAvatarUrl ? (
              <img src={listing.sellerAvatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <UserRound className="size-9 text-[#2a2a2e]" strokeWidth={1.5} />
            )}
          </span>
        </div>
        <div className={cn(SERIF, "flex min-h-[148px] flex-1 flex-col px-[14px] pb-[14px] pt-[15px]")}>
          <span className="truncate text-[12px] text-[#7b3aec]">{listing.sellerName}</span>
          <h3 className="mt-[9px] truncate text-[14px] text-white group-hover:underline">{listing.title}</h3>
          <p className="mt-[9px] line-clamp-2 text-[12px] leading-[17px] text-white">{listing.description}</p>
          <span className="mt-auto pt-3 text-[19px] text-[#7b3aec] tabular-nums">
            ${(listing.priceCents / 100).toFixed(2)} <span className="text-[12px]">USD</span>
          </span>
        </div>
      </Link>
      <FavoriteButton
        listingId={listing._id}
        sellerId={listing.sellerId}
        variant="bookmark"
        className="absolute bottom-[14px] right-[14px] text-[#7b3aec] [&_svg]:size-[17px]"
      />
    </div>
  );
}

/** The Shop tab body: title, category filter, "Showing x-y of n", the 3-column grid and Previous / Next. */
export function ShopTab({ sellerId, total: allCount, isMe }: { sellerId: Id<"users">; total: number; isMe: boolean }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [page, setPage] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const data = useQuery(api.listings.shopPage, {
    sellerId,
    page,
    category: category === "all" ? undefined : category,
  });
  useEffect(() => setPage(0), [category]);

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const go = (next: number) => {
    setPage(next);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={top} className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className={cn(SANS, "flex flex-wrap items-baseline gap-x-2.5 leading-tight")}>
            <span className="text-[22px] text-white">Shop</span>
            <span className="text-[20px] tracking-[0.02em] text-[#7b3aec]">
              {allCount} {allCount === 1 ? "Listing" : "Listings"}
            </span>
          </h2>
          <span className="h-0.5 w-[60px] bg-[#7b3aec]" />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as Category | "all")}>
          <SelectTrigger
            aria-label="Filter by category"
            className={cn(SERIF, "h-[38px] w-full cursor-pointer rounded-[5px] border-2 border-[#7b3aec] bg-[#111317] px-3 text-[15px] text-white sm:w-[445px] lg:w-[445px]")}
          >
            <SelectValue placeholder="Filter By Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className={cn(SERIF, "text-[15px] text-white")}>
        {data === undefined
          ? "Loading listings…"
          : total === 0
            ? "No listings to show."
            : `Showing ${from}-${to} of ${total} Listings.`}
      </p>

      <div className="rounded-[5px] bg-[#18191d] p-[17px]">
        {data === undefined ? (
          <div className="grid gap-[17px] sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[370px] w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className={cn(SERIF, "flex flex-col items-center gap-3 py-16 text-center text-white")}>
            <p>{category === "all" ? "Nothing for sale" : "No listings in this category."}</p>
            {isMe && category === "all" && (
              <Button asChild size="sm" className="cursor-pointer">
                <Link href="/sell">List an item</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-[17px] sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((l) => (
              <ShopCard key={l._id} listing={l} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-[27px] grid grid-cols-2 overflow-hidden rounded-[5px] border-2 border-[#5e2faf]">
        <Button
          type="button"
          variant="ghost"
          disabled={page === 0}
          onClick={() => go(Math.max(0, page - 1))}
          className={cn(SANS, "h-[58px] cursor-pointer gap-3 rounded-none border-r-2 border-[#5e2faf] text-[19px] uppercase tracking-[0.02em] text-white hover:bg-[#7b3aec]/20")}
        >
          <ChevronLeft className="size-5 text-[#7b3aec]" /> Previous
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={(page + 1) * pageSize >= total}
          onClick={() => go(page + 1)}
          className={cn(SANS, "h-[58px] cursor-pointer gap-3 rounded-none text-[19px] uppercase tracking-[0.02em] text-white hover:bg-[#7b3aec]/20")}
        >
          Next <ChevronRight className="size-5 text-[#7b3aec]" />
        </Button>
      </div>
    </div>
  );
}
