"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronDown, Crown, EllipsisVertical, Heart, IdCard, ImageIcon, Link2, Pencil, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { useBackendAuth, useMutation, useQuery } from "@/lib/backend/react.tsx";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import { api } from "@/lib/backend/api.ts";
import { settingsPathFor } from "@/lib/settings.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { useAccess } from "@/hooks/use-access.ts";
import { SELLER_DETAIL_FIELDS } from "@/shared/sellerDetails.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import CustomRequestButton from "@/components/custom-request-button.tsx";
import MessageSellerButton from "./message-seller-dialog.tsx";
import ExpandableBio from "./expandable-bio.tsx";
import CountryFlag from "@/components/country-flag.tsx";
import { copyProfileLink } from "../_lib/profile-share.ts";
import { PANEL } from "../_lib/theme.ts";

type Profile = NonNullable<FunctionReturnType<typeof api.users.getProfile>>;

/** Small buttons of the card: solid "MESSAGE SELLER", outlined "EDIT PROFILE" and "⋮". */
const SOLID_BTN =
  "h-[24px] cursor-pointer gap-1.5 rounded-[1px] bg-violet-600 px-3 text-[9px] font-bold uppercase tracking-[0.08em] text-white hover:bg-violet-500 [&_svg]:size-3";
const OUTLINE_BTN =
  "h-[24px] cursor-pointer gap-1.5 rounded-[1px] border border-violet-600 bg-transparent px-2.5 text-[9px] font-bold uppercase tracking-[0.08em] text-violet-500 hover:bg-violet-600 hover:text-white [&_svg]:size-3";

/** The details list of the design, in its order; Age comes from the age range. */
const MAIN_DETAILS: { key: string; label: string }[] = [
  { key: "gender", label: "Gender" },
  { key: "ageRange", label: "Age" },
  { key: "ethnicity", label: "Ethnicity" },
  { key: "bodySize", label: "Body Size" },
];
const MAIN_KEYS = new Set([...MAIN_DETAILS.map((d) => d.key), "country"]);
const NOT_SET = "Not set";

const filled = (v: string | undefined) => !!v?.trim() && v !== "Prefer not to say";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[12px] leading-[22px]">
      <dt className="text-[#999a9e]">{label}:</dt>
      <dd className="truncate text-right text-[#f9f9f9]">{value}</dd>
    </div>
  );
}

/** "Follow" / "Unfollow" in the ⋮ menu for signed-in visitors. */
function FollowItem({ sellerId }: { sellerId: Profile["_id"] }) {
  const following = useQuery(api.follows.isFollowing, { sellerId });
  const toggle = useMutation(api.follows.toggle);
  return (
    <DropdownMenuItem
      className="cursor-pointer"
      disabled={following === undefined}
      onSelect={() =>
        toggle({ sellerId })
          .then((now) => toast.success(now ? "Following. New listings will show in your feed." : "Unfollowed"))
          .catch((e) => toast.error(getErrorMessage(e, "Could not update follow")))
      }
    >
      <Heart /> {following ? "Unfollow" : "Follow"}
    </DropdownMenuItem>
  );
}

/**
 * Left column of the profile: the square profile picture, then one card with
 * the seller level, name, rating, Message / Edit and ⋮ buttons, bio,
 * follower counts and the details list.
 */
export default function ProfileSidebar({ profile }: { profile: Profile }) {
  const { isAuthenticated } = useBackendAuth();
  const access = useAccess();
  const [customOpen, setCustomOpen] = useState(false);
  const [more, setMore] = useState(false);
  const { rating, reviewCount, followerCount } = profile.stats;
  const details = profile.sellerDetails as Record<string, string | undefined>;

  const main = MAIN_DETAILS.map((d) => ({ ...d, value: filled(details[d.key]) ? details[d.key]! : NOT_SET }));
  // Gender and Age always show; the rest waits behind Show more
  const [gender, age, ...restMain] = main;
  const country = details.country;
  const extra = SELLER_DETAIL_FIELDS.filter((f) => !MAIN_KEYS.has(f.key) && filled(details[f.key])).map((f) => ({
    key: f.key,
    label: f.label,
    value: details[f.key]!,
  }));
  const canRequestCustom = !profile.isMe && isAuthenticated && !!access?.can.buy;

  return (
    <aside className="flex flex-col gap-[14px] lg:sticky lg:top-20">
      <div className={cn(PANEL, "aspect-square overflow-hidden border-white/40 bg-[#85868a]")}>
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageIcon className="size-4/5 text-[#5c5d61]" strokeWidth={1.2} />
          </div>
        )}
      </div>

      <div className={cn(PANEL, "flex flex-col bg-[#040a18] px-[16px] pb-[18px] pt-[16px]")}>
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7b3aec]">
          <Crown className="size-3" /> {profile.isPro ? "Premium Seller" : "Seller"}
        </p>
        <h1 className="mt-1 truncate text-[22px] font-bold leading-tight tracking-[0.06em] text-[#83868d]">
          {profile.name}
        </h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-[#787b84]">
          <span
            className="flex items-center gap-1"
            aria-label={rating ? `Rated ${rating.toFixed(1)} from ${reviewCount} reviews` : "No ratings yet"}
          >
            <Star className="size-3.5 text-violet-600" />
            {rating ? rating.toFixed(1) : "0.0"} ({reviewCount})
          </span>
          {country && (
            <span className="flex items-center gap-1.5">
              <CountryFlag country={country} className="h-2.5 w-3.5 rounded-[1px] object-cover" />
              {country}
            </span>
          )}
          {profile.verified && (
            <span className="flex items-center gap-1">
              <IdCard className="size-3.5 text-violet-600" /> ID Verified
            </span>
          )}
        </p>

        {/* The design's three buttons: Message seller (visitors), Edit profile (you), ⋮ */}
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] items-center gap-3">
          {profile.isMe ? (
            <span />
          ) : (
            <MessageSellerButton sellerId={profile._id} sellerName={profile.name} className={cn(SOLID_BTN, "w-full max-w-[118px]")} />
          )}
          {profile.isMe ? (
            <Button asChild size="sm" className={OUTLINE_BTN}>
              <Link href={settingsPathFor(profile.accountType)}>
                <Pencil /> Edit profile
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" aria-label="More options" className={cn(OUTLINE_BTN, "w-[26px] px-0")}>
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!profile.isMe && isAuthenticated && <FollowItem sellerId={profile._id} />}
              {canRequestCustom && (
                <DropdownMenuItem className="cursor-pointer" onSelect={() => setCustomOpen(true)}>
                  <Sparkles /> Request a custom
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer" onSelect={() => void copyProfileLink(profile._id)}>
                <Link2 /> Copy profile link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {canRequestCustom && (
          <CustomRequestButton
            sellerId={profile._id}
            sellerName={profile.name}
            open={customOpen}
            onOpenChange={setCustomOpen}
            hideTrigger
          />
        )}

        <div className="min-h-[64px] py-4 text-[12px] leading-5">
          {profile.bio && <ExpandableBio text={profile.bio} />}
        </div>

        <p className="text-center text-[11px] text-[#fefefe]">
          ({followerCount}) Followers - ({profile.counts.following}) Following - ({profile.badges.length}) Badges
        </p>

        <dl className="mt-5 flex flex-col">
          <Detail label={gender.label} value={gender.value} />
          <Detail label={age.label} value={age.value} />
          {more && (
            <>
              {restMain.map((d) => (
                <Detail key={d.key} label={d.label} value={d.value} />
              ))}
              {extra.map((d) => (
                <Detail key={d.key} label={d.label} value={d.value} />
              ))}
              {profile.paymentMethods.length > 0 && (
                <Detail label="Payment Methods" value={profile.paymentMethods.join(", ")} />
              )}
              {profile.offerings.length > 0 && <Detail label="What I Offer" value={profile.offerings.join(", ")} />}
            </>
          )}
        </dl>
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((m) => !m)}
          className="my-1 flex cursor-pointer items-center gap-1 self-start text-[11px] text-[#999a9e] hover:text-[#f9f9f9]"
        >
          {more ? "Show less" : "Show more"}
          <ChevronDown className={cn("size-3.5 text-violet-600 transition-transform", more && "rotate-180")} />
        </button>
        <dl className="flex flex-col">
          <Detail label="Joined" value={format(profile.memberSince, "MMM yyyy")} />
          <Detail label="Profile Visits" value={profile.activity.profileVisits.toLocaleString("en-US")} />
        </dl>
      </div>
    </aside>
  );
}
