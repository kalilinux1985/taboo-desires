"use client";

import { Gem, Star, UserRound } from "lucide-react";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import type { api } from "@/lib/backend/api.ts";
import { cn } from "@/lib/utils.ts";
import CountryFlag from "@/components/country-flag.tsx";
import { PANEL } from "../_lib/theme.ts";

type Profile = NonNullable<FunctionReturnType<typeof api.users.getProfile>>;

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Slim profile header on the Shop, Instant Content, Photos and Reviews tabs:
 * ringed picture with an online dot, seller level, name and flag, rating.
 */
export default function ProfileCompactHeader({ profile }: { profile: Profile }) {
  const { rating, reviewCount } = profile.stats;
  const country = profile.sellerDetails.country;
  const lastSeen = profile.activity.lastSeenAt;
  const online = !!lastSeen && Date.now() - Date.parse(lastSeen) < ONLINE_WINDOW_MS;

  return (
    <header className={cn(PANEL, "flex items-center gap-4 p-4 sm:gap-6 sm:p-5")}>
      <div className="relative shrink-0">
        <div className="size-20 overflow-hidden rounded-full border-[3px] border-violet-600 bg-[#8b8b90] sm:size-24">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <UserRound className="size-2/3 text-[#5f5f64]" strokeWidth={1.1} />
            </div>
          )}
        </div>
        {online && (
          <span
            aria-label="Online"
            className="absolute bottom-1 right-1 size-3.5 rounded-full border-2 border-[#0a1123] bg-emerald-500"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
          <Gem className="size-3.5" /> {profile.isPro ? "Premium Seller" : "Seller"}
        </p>
        <h1 className="flex min-w-0 items-center gap-2.5 text-2xl font-bold text-slate-200 sm:text-3xl">
          <span className="truncate">{profile.name}</span>
          {country && <CountryFlag country={country} className="h-4 w-6 shrink-0 rounded-[2px] object-cover" />}
        </h1>
        <p
          className="flex items-center gap-1.5 text-sm text-slate-300"
          aria-label={rating ? `Rated ${rating.toFixed(1)} from ${reviewCount} reviews` : "No ratings yet"}
        >
          <Star className="size-4 text-violet-600" />
          {rating ? (
            <>
              {rating.toFixed(1)} <span className="text-slate-400">({reviewCount})</span>
            </>
          ) : (
            <span className="text-slate-400">No ratings yet</span>
          )}
        </p>
      </div>
    </header>
  );
}
