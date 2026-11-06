"use client";

import Link from "next/link";
import { Award, EllipsisVertical, IdCard, Images, Link2, Pencil, ShoppingBag, Star, UserRound } from "lucide-react";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import type { api } from "@/lib/backend/api.ts";
import { settingsPathFor } from "@/lib/settings.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import CustomRequestButton from "@/components/custom-request-button.tsx";
import FollowButton from "./follow-button.tsx";
import MessageSellerButton from "./message-seller-dialog.tsx";
import { copyProfileLink } from "../_lib/profile-share.ts";
import { PANEL } from "../_lib/theme.ts";

type Profile = NonNullable<FunctionReturnType<typeof api.users.getProfile>>;

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const isOnline = (lastSeenAt: string | null) =>
  !!lastSeenAt && Date.now() - Date.parse(lastSeenAt) < ONLINE_WINDOW_MS;

/** Profile picture with online badge, then name, rating, country, actions and counts. */
export default function ProfileSidebar({
  profile,
  onShowShop,
  onShowInstant,
}: {
  profile: Profile;
  onShowShop: () => void;
  onShowInstant: () => void;
}) {
  const rating = profile.stats.rating;
  const country = profile.sellerDetails.country;
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
      <div className={cn(PANEL, "relative aspect-square overflow-hidden bg-[#8b8b90]")}>
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <UserRound className="size-2/3 text-[#5f5f64]" strokeWidth={1.1} />
          </div>
        )}
        {isOnline(profile.activity.lastSeenAt) && (
          <span className="absolute right-0 top-0 rounded-bl-md bg-emerald-500 px-2.5 py-0.5 text-xs font-bold text-white">
            Online
          </span>
        )}
      </div>

      <div className={cn(PANEL, "flex flex-col gap-3 p-4")}>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-500">
            <Award className="size-3.5" /> {profile.isPro ? "Premium seller" : "Seller"}
          </p>
          <h1 className="truncate text-3xl font-bold tracking-wide text-slate-200">{profile.name}</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Star className={cn("size-4 text-violet-500", rating && "fill-violet-500")} />
              {rating ? rating.toFixed(1) : "No ratings"}
              {profile.stats.reviewCount > 0 && <span className="text-xs">({profile.stats.reviewCount})</span>}
            </span>
            {country && <span>{country}</span>}
            {profile.verified ? (
              <span className="flex items-center gap-1">
                <IdCard className="size-4 text-violet-500" /> ID Verified
              </span>
            ) : (
              profile.isMe && (
                <Link href={settingsPathFor(profile.accountType)} className="flex items-center gap-1 font-bold text-slate-200 hover:underline">
                  <IdCard className="size-4 text-violet-500" /> Verify Your Identity &gt;
                </Link>
              )
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {profile.isMe ? (
            <Button asChild size="sm" variant="ghost" className="h-8 flex-1 cursor-pointer rounded-sm border border-violet-600 text-xs font-bold uppercase text-violet-400 hover:bg-violet-600 hover:text-white">
              <Link href={settingsPathFor(profile.accountType)}>
                <Pencil /> Edit profile
              </Link>
            </Button>
          ) : (
            <>
              <MessageSellerButton
                sellerId={profile._id}
                sellerName={profile.name}
                className="h-8 flex-1 cursor-pointer rounded-sm bg-violet-600 text-xs font-bold uppercase text-white hover:bg-violet-500"
              />
              <FollowButton sellerId={profile._id} />
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label="More options"
                className="size-8 cursor-pointer rounded-sm border border-violet-600 text-violet-400"
              >
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onSelect={() => void copyProfileLink(profile._id)}>
                <Link2 /> Copy profile link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!profile.isMe && (
          <CustomRequestButton sellerId={profile._id} sellerName={profile.name} className="w-full" />
        )}

        <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
          <button
            type="button"
            onClick={onShowShop}
            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1b2235] px-3 py-1.5 text-sm font-bold text-slate-200 hover:bg-violet-600/30"
          >
            <ShoppingBag className="size-4 text-violet-500" /> {profile.counts.listings} Listing
            {profile.counts.listings === 1 ? "" : "s"}
          </button>
          <button
            type="button"
            onClick={onShowInstant}
            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1b2235] px-3 py-1.5 text-sm font-bold text-slate-200 hover:bg-violet-600/30"
          >
            <Images className="size-4 text-violet-500" /> {profile.counts.instantContent} Instant Content
          </button>
        </div>
      </div>
    </aside>
  );
}
