"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Award, EllipsisVertical, IdCard, Link2, Pencil, Star, UserRound } from "lucide-react";
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

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <dt className="text-slate-400">{label}:</dt>
      <dd className="truncate text-right text-slate-200">{value ?? "-"}</dd>
    </div>
  );
}

/** Left column: big profile picture, then name, rating, actions, counts and details. */
export default function ProfileSidebar({ profile }: { profile: Profile }) {
  const d = profile.sellerDetails;
  const rating = profile.stats.rating;
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
      <div className={cn(PANEL, "aspect-square overflow-hidden bg-[#8b8b90]")}>
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <UserRound className="size-2/3 text-[#5f5f64]" strokeWidth={1.1} />
          </div>
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
            {profile.verified && (
              <span className="flex items-center gap-1">
                <IdCard className="size-4 text-violet-500" /> ID Verified
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {profile.isMe ? (
            <Button asChild size="sm" variant="ghost" className="h-8 cursor-pointer rounded-sm border border-violet-600 text-xs font-bold uppercase text-violet-400 hover:bg-violet-600 hover:text-white">
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

        <p className="py-6 text-center text-sm text-slate-300">
          ({profile.stats.followerCount}) Followers · ({profile.counts.following}) Following ·{" "}
          ({profile.badges.length}) Badges
        </p>

        <dl>
          <Detail label="Gender" value={d.gender} />
          <Detail label="Age" value={d.ageRange} />
          <Detail label="Ethnicity" value={d.ethnicity} />
          <Detail label="Body Size" value={d.bodySize} />
          <Detail label="Joined" value={format(profile.memberSince, "MMM yyyy")} />
          <Detail label="Profile Visits" value={profile.activity.profileVisits.toLocaleString("en-US")} />
        </dl>
      </div>
    </aside>
  );
}
