"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import type { api } from "@/lib/backend/api.ts";
import { cn } from "@/lib/utils.ts";
import { SELLER_DETAIL_FIELDS } from "@/shared/sellerDetails.ts";
import { ProfilePanel } from "./profile-sections.tsx";
import ExpandableBio from "./expandable-bio.tsx";

type Profile = NonNullable<FunctionReturnType<typeof api.users.getProfile>>;

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <dt className="text-slate-400">{label}:</dt>
      <dd className="truncate text-right text-slate-200">{value}</dd>
    </div>
  );
}

/** A filled-in list (payment methods, what they offer), wrapped onto several lines. */
function ListDetail({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 py-1 text-sm">
      <dt className="text-slate-400">{label}:</dt>
      <dd className="text-slate-200">{items.join(", ")}</dd>
    </div>
  );
}

// Shown before "Show more"; country already appears on the profile card
const FIRST = ["gender", "ageRange"];
const SKIP = new Set(["country"]);

/** Settings fields the seller filled in ("Prefer not to say" counts as not shared). */
function filledDetails(details: Record<string, string | undefined>) {
  return SELLER_DETAIL_FIELDS.filter((f) => !SKIP.has(f.key))
    .map((f) => ({ key: f.key, label: f.label, value: details[f.key]?.trim() }))
    .filter((f): f is { key: typeof f.key; label: typeof f.label; value: string } =>
      !!f.value && f.value !== "Prefer not to say",
    );
}

/** Overview's first card: followers, following, bio and details (more behind Show more). */
export default function ProfileAbout({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const details = filledDetails(profile.sellerDetails as Record<string, string | undefined>);
  const first = details.filter((f) => FIRST.includes(f.key));
  const more = details.filter((f) => !FIRST.includes(f.key));
  return (
    <ProfilePanel title={`About ${profile.name}`}>
      <p className="-mt-2 text-sm text-slate-300">
        {profile.stats.followerCount} Followers · {profile.counts.following} Following
      </p>
      {profile.bio && (
        <ExpandableBio text={profile.bio} className="border-t border-[#1a2238]/45 pt-4" />
      )}
      <dl className="border-t border-[#1a2238]/45 pt-3">
        {first.map((f) => (
          <Detail key={f.key} label={f.label} value={f.value} />
        ))}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex cursor-pointer items-center gap-1 py-1 text-sm text-slate-400 hover:text-slate-200"
        >
          {open ? "Hide" : "Show more"}
          <ChevronDown className={cn("size-4 text-violet-600 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="mt-1 border-t border-[#1a2238]/45 pt-2">
            {more.map((f) => (
              <Detail key={f.key} label={f.label} value={f.value} />
            ))}
            <ListDetail label="Payment Methods" items={profile.paymentMethods} />
            <ListDetail label="What I Offer" items={profile.offerings} />
            <Detail label="Joined" value={format(profile.memberSince, "MMM yyyy")} />
            <Detail label="Profile Visits" value={profile.activity.profileVisits.toLocaleString("en-US")} />
          </div>
        )}
      </dl>
    </ProfilePanel>
  );
}
