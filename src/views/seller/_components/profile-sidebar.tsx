"use client";

import ReportButton from "@/components/report-button.tsx";
import { useState } from "react";
import Link from "next/link";
import { CircleCheck, Star, UserCog } from "lucide-react";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import type { api } from "@/lib/backend/api.ts";
import { settingsPathFor } from "@/lib/settings.ts";
import { cn } from "@/lib/utils.ts";
import { SELLER_DETAIL_FIELDS } from "@/shared/sellerDetails.ts";
import MessageSellerButton from "./message-seller-dialog.tsx";
import FollowButton from "./follow-button.tsx";
import ExpandableBio from "./expandable-bio.tsx";
import { Detail, FILLED_ACTION, Frame, NURMA, OUTLINED_ACTION, SANS, SERIF, joinedAgo } from "../_lib/profile-design.tsx";

type Profile = NonNullable<FunctionReturnType<typeof api.users.getProfile>>;

const NOT_SET = "Not set";
const filled = (v: string | undefined) => !!v?.trim() && v !== "Prefer not to say";

/** Details that open under MORE, in order (Gender and Age always show). */
const MORE_DETAILS: { key: string; label: string }[] = [
  { key: "ethnicity", label: "Ethnicity" },
  { key: "bodySize", label: "Body Size" },
];
const SHOWN_KEYS = new Set(["ageRange", "gender", "country", ...MORE_DETAILS.map((d) => d.key)]);

/**
 * About card under the profile picture: followers, Gender, Age, MORE for the
 * rest (Ethnicity, Body Size, other details, payment methods, offerings),
 * Joined, Profile Visits.
 */
export default function SellerAbout({ profile }: { profile: Profile }) {
  const [more, setMore] = useState(false);
  const details = profile.sellerDetails as Record<string, string | undefined>;
  const value = (key: string) => (filled(details[key]) ? details[key]! : NOT_SET);
  const extra = SELLER_DETAIL_FIELDS.filter((f) => !SHOWN_KEYS.has(f.key) && filled(details[f.key]));

  return (
    <Frame className="[grid-area:about] self-start"innerClassName={cn(SANS, "px-4 pb-6 pt-[21px] lg:min-h-[345px]")}>
      <p className="text-center text-[15px] text-white">
        {profile.stats.followerCount} Followers - {profile.counts.following} Following
      </p>
      <span className="mb-3 mt-[21px] block h-px bg-[#0a0c18]" />
      <dl className="flex flex-col">
        <Detail label="Gender" value={value("gender")} />
        <Detail label="Age" value={value("ageRange")} />
        {more && (
          <>
            {MORE_DETAILS.map((d) => (
              <Detail key={d.key} label={d.label} value={value(d.key)} />
            ))}
            {extra.map((f) => (
              <Detail key={f.key} label={f.label} value={details[f.key]!} />
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
        className="mt-1 cursor-pointer text-[11px] uppercase tracking-[0.06em] text-[#ffffff] hover:text-[#7b3aec]"
      >
        {more ? "Less" : "More"}
      </button>
      <dl className="mt-3 flex flex-col">
        <Detail label="Joined" value={joinedAgo(profile.memberSince)} />
        <Detail label="Profile Visits" value={profile.activity.profileVisits.toLocaleString("en-US")} />
      </dl>
    </Frame>
  );
}

/**
 * Header card: seller level, name, rating and country, Message Seller (Edit
 * Profile on your own), bio. The rating opens the Reviews tab.
 */
export function ProfileHeaderCard({ profile, onReviews }: { profile: Profile; onReviews: () => void }) {
  const country = profile.sellerDetails.country ?? profile.location;
  const { rating, reviewCount } = profile.stats;
  return (
    <Frame className="[grid-area:header]" innerClassName="flex flex-col px-[22px] py-[18px] lg:min-h-[345px]">
      <p className={cn(SANS, "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#7b3aec]")}>
        <CircleCheck className="size-3" /> {profile.isPro ? "Premium Seller" : "Seller"}
      </p>
      <h1 className={cn(NURMA, "mt-1 truncate text-[24px] uppercase leading-tight tracking-[0.03em] text-white")}>{profile.name}</h1>
      <p className={cn(SERIF, "mt-1 flex flex-wrap items-center gap-x-4 text-[17px] text-[#7b3aec]")}>
        <button
          type="button"
          onClick={onReviews}
          className="flex cursor-pointer items-center gap-1 hover:underline"
          title={`${reviewCount} review${reviewCount === 1 ? "" : "s"}`}
        >
          <Star className="size-[18px]" strokeWidth={1.75} />
          {(rating ?? 0).toFixed(1)} ({reviewCount})
        </button>
        {country && <span>{country}</span>}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-[18px]">
        {profile.isMe ? (
          <Link
            href={settingsPathFor(profile.accountType)}
            className={cn(OUTLINED_ACTION, SERIF, "gap-1.5 px-2 text-[10px] font-bold uppercase")}
          >
            <UserCog className="size-3.5" strokeWidth={1.75} /> Edit Profile
          </Link>
        ) : (
          <MessageSellerButton
            sellerId={profile._id}
            sellerName={profile.name}
            className={FILLED_ACTION}
            label="Message Seller"
            showIcon={false}
          />
        )}
        {!profile.isMe && <ReportButton target={{ kind: "profile", id: profile._id }} className="px-1" />}
      </div>
      {!profile.isMe && (
        <div className="mt-3">
          <FollowButton userId={profile._id} targetType="seller" />
        </div>
      )}
      {profile.bio && (
        <div className={cn(SANS, "mt-6 text-[14px] leading-6 text-white")}>
          <ExpandableBio text={profile.bio} />
        </div>
      )}
    </Frame>
  );
}
