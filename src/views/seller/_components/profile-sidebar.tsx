"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CircleCheck, UserRound } from "lucide-react";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import type { api } from "@/lib/backend/api.ts";
import { settingsPathFor } from "@/lib/settings.ts";
import { cn } from "@/lib/utils.ts";
import { SELLER_DETAIL_FIELDS } from "@/shared/sellerDetails.ts";
import MessageSellerButton from "./message-seller-dialog.tsx";
import ExpandableBio from "./expandable-bio.tsx";
import { DISPLAY_FONT, INSET, PANEL } from "../_lib/theme.ts";

type Profile = NonNullable<FunctionReturnType<typeof api.users.getProfile>>;

const NOT_SET = "Not set";
const filled = (v: string | undefined) => !!v?.trim() && v !== "Prefer not to say";

/** Details that open under MORE, in order (Age and Gender always show). */
const MORE_DETAILS: { key: string; label: string }[] = [
  { key: "ethnicity", label: "Ethnicity" },
  { key: "bodySize", label: "Body Size" },
];
const SHOWN_KEYS = new Set(["ageRange", "gender", "country", ...MORE_DETAILS.map((d) => d.key)]);

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[12px] leading-[24px]">
      <dt className="text-[#f9f9f9]">{label}:</dt>
      <dd className="truncate text-right font-bold text-white">{value}</dd>
    </div>
  );
}

/** "1 year ago", without date-fns' "about"/"over"/"almost". */
const joinedAgo = (date: string | number) =>
  formatDistanceToNow(new Date(date), { addSuffix: true }).replace(/^(about|over|almost) /, "");

/**
 * Left column of the profile: the square profile picture, then the About card
 * (followers, Age, Gender, MORE for the rest, Joined, Profile Visits).
 */
export default function ProfileSidebar({ profile }: { profile: Profile }) {
  const [more, setMore] = useState(false);
  const details = profile.sellerDetails as Record<string, string | undefined>;
  const value = (key: string) => (filled(details[key]) ? details[key]! : NOT_SET);
  const extra = SELLER_DETAIL_FIELDS.filter((f) => !SHOWN_KEYS.has(f.key) && filled(details[f.key]));

  return (
    <aside className="flex flex-col gap-[18px] lg:sticky lg:top-20">
      <div className={cn(PANEL, "aspect-square overflow-hidden bg-[#b9babe]")}>
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-end justify-center">
            <UserRound className="size-[92%] translate-y-[8%] text-[#2a2a2e]" strokeWidth={1.4} />
          </div>
        )}
      </div>

      <section className={cn(PANEL, "flex min-h-[396px] flex-col px-[17px] pb-6 pt-[24px]")}>
        <h2 className="text-[18px] text-violet-600">About</h2>
        <p className="mt-3 text-[12px] text-[#fcfcfc]">
          {profile.stats.followerCount} Followers - {profile.counts.following} Following
        </p>
        <span className="mt-3.5 h-px bg-violet-600/25" />

        <dl className="mt-3.5 flex flex-col">
          <Detail label="Age" value={value("ageRange")} />
          <Detail label="Gender" value={value("gender")} />
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
          className="mt-1 cursor-pointer self-start text-[9px] uppercase tracking-[0.06em] text-[#e5e5e5] hover:text-violet-600"
        >
          {more ? "Less" : "More"}
        </button>

        <dl className="mt-6 flex flex-col">
          <Detail label="Joined" value={joinedAgo(profile.memberSince)} />
          <Detail label="Profile Visits" value={profile.activity.profileVisits.toLocaleString("en-US")} />
        </dl>
      </section>
    </aside>
  );
}

/** Top of the right column: seller level, name, Message Seller (Edit Profile on your own), bio. */
export function ProfileHeaderCard({ profile }: { profile: Profile }) {
  const button = cn(
    DISPLAY_FONT,
    "inline-flex h-[34px] w-full max-w-[252px] cursor-pointer items-center justify-center rounded-[1px] bg-[#260053] px-5 text-[17px] font-semibold tracking-[0.06em] text-[#dddddd] transition-colors hover:bg-violet-600 hover:text-white",
  );
  return (
    <section className={cn(PANEL, "p-[18px]")}>
      <div className={cn(INSET, "flex min-h-[288px] flex-col px-[22px] py-[22px]")}>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-violet-600">
          <CircleCheck className="size-3" /> {profile.isPro ? "Premium Seller" : "Seller"}
        </p>
        <h1
          className={cn(
            DISPLAY_FONT,
            "truncate text-[26px] font-semibold uppercase leading-tight tracking-[0.04em] text-[#dddddd]",
          )}
        >
          {profile.name}
        </h1>
        <div className="mt-8">
          {profile.isMe ? (
            <Link href={settingsPathFor(profile.accountType)} className={button}>
              Edit Profile
            </Link>
          ) : (
            <MessageSellerButton
              sellerId={profile._id}
              sellerName={profile.name}
              className={button}
              label="Message Seller"
              showIcon={false}
            />
          )}
        </div>
        {profile.bio && (
          <div className="mt-6 text-[13px] leading-6">
            <ExpandableBio text={profile.bio} />
          </div>
        )}
      </div>
    </section>
  );
}
