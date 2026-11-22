"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImageIcon, Images, UserRound, Video } from "lucide-react";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType, Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import FavoriteButton from "@/components/favorite-button.tsx";
import { NURMA, SERIF } from "../_lib/profile-design.tsx";
import { Pager } from "./photos-tab.tsx";

type Item = FunctionReturnType<typeof api.listings.shopPage>["items"][number];

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** "10 Pics" or "1:08 Video", the part shown in violet. */
function mediaLabel(l: Item): { video: boolean; text: string } {
  if (l.lockedVideoSec !== null) return { video: true, text: l.lockedVideoSec > 0 ? `${clock(l.lockedVideoSec)} Video` : "Video" };
  return { video: false, text: `${l.lockedPhotoCount} ${l.lockedPhotoCount === 1 ? "Pic" : "Pics"}` };
}

function InstantCard({ listing }: { listing: Item }) {
  const media = mediaLabel(listing);
  const profileHref = listing.sellerUsername ? `/${listing.sellerUsername}` : `/seller/${listing.sellerId}`;
  return (
    <div className="rounded-[5px] bg-[#202227] p-[10px] shadow-[0_6px_14px_rgba(0,0,0,0.35)]">
      <div className="relative flex min-w-0 flex-col overflow-hidden rounded-[5px] bg-[#141519] shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
        <div className="relative aspect-[1.57] bg-white">
          <Link href={`/listing/${listing._id}`} className="absolute inset-0 block cursor-pointer overflow-hidden">
            {listing.imageUrl ? (
              <img src={listing.imageUrl} alt={listing.title} loading="lazy" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center">
                <ImageIcon className="size-[55%] text-[#8a9199]" strokeWidth={1.1} />
              </span>
            )}
          </Link>
          {/* Seller's picture over the bottom-left corner */}
          <Link
            href={profileHref}
            aria-label={`${listing.sellerName}'s profile`}
            className="absolute bottom-[-4px] left-[16px] flex size-[66px] cursor-pointer items-center justify-center overflow-hidden rounded-[3px] bg-[#a8a9ae]"
          >
            {listing.sellerAvatarUrl ? (
              <img src={listing.sellerAvatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <UserRound className="size-12 text-[#2a2a2e]" strokeWidth={1.5} />
            )}
          </Link>
        </div>
        <div className="flex min-h-[186px] flex-1 flex-col px-[11px] pb-[12px] pt-[16px]">
          <Link href={profileHref} className={cn(NURMA, "truncate text-[18px] leading-tight text-[#7b3aec] hover:underline")}>
            {listing.sellerName}
          </Link>
          <Link href={`/listing/${listing._id}`} className={cn(SERIF, "mt-0.5 truncate text-[17px] font-bold text-[#7b3aec] hover:underline")}>
            {listing.title}
          </Link>
          <p className={cn(SERIF, "mt-2.5 flex items-center gap-1.5 pl-[18px] text-[14px] text-white")}>
            {media.video ? (
              <Video className="size-[18px] text-[#7b3aec]" strokeWidth={1.75} />
            ) : (
              <Images className="size-[16px] text-[#7b3aec]" strokeWidth={1.75} />
            )}
            <span className="text-[#7b3aec]">{media.text}</span> ready to be unlocked!
          </p>
          <p className={cn(SERIF, "mt-3 line-clamp-2 text-[15px] leading-[20px] text-white")}>{listing.description}</p>
          <span className={cn(SERIF, "mt-auto pt-3 text-[21px] text-[#7b3aec] tabular-nums")}>
            ${(listing.priceCents / 100).toFixed(2)} <span className="text-[13px]">USD</span>
          </span>
        </div>
        <FavoriteButton
          listingId={listing._id}
          sellerId={listing.sellerId}
          variant="bookmark"
          className="absolute bottom-[14px] right-[12px] text-[#7b3aec] [&_svg]:size-[17px]"
        />
      </div>
    </div>
  );
}

/** The Instant Content tab (sellers only): title, "Showing x-y of n items.", 3-column grid, Previous / Next. */
export function InstantTab({ sellerId, total: allCount, isMe }: { sellerId: Id<"users">; total: number; isMe: boolean }) {
  const [page, setPage] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const data = useQuery(api.listings.shopPage, { sellerId, page, kind: "instant" });
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
      <div className="flex flex-col gap-1.5">
        <h2 className={cn(NURMA, "flex flex-wrap items-baseline gap-x-1.5 leading-tight")}>
          <span className="text-[27px] text-white">Instant Content</span>
          <span className="text-[25px] text-[#7b3aec]">
            {allCount} {allCount === 1 ? "Item" : "Items"}
          </span>
        </h2>
        <span className="h-[3px] w-[62px] rounded-full bg-[#7b3aec]" />
      </div>

      <p className={cn(SERIF, "text-[15px] text-white")}>
        {data === undefined ? "Loading items…" : total === 0 ? "No items to show." : `Showing ${from}-${to} of ${total} items.`}
      </p>

      {data === undefined ? (
        <div className="grid gap-[28px] sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[420px] w-full" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className={cn(SERIF, "flex flex-col items-center gap-3 py-16 text-center text-white")}>
          <p>No Instant Content yet</p>
          {isMe && (
            <Button asChild size="sm" className="cursor-pointer">
              <Link href="/sell">Add Instant Content</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-[28px] sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((l) => (
            <InstantCard key={l._id} listing={l} />
          ))}
        </div>
      )}

      {total > pageSize && <Pager page={page} hasNext={(page + 1) * pageSize < total} onGo={go} />}
    </div>
  );
}
