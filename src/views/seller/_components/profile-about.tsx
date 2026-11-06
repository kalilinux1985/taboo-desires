"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import type { api } from "@/lib/backend/api.ts";
import { cn } from "@/lib/utils.ts";
import { ProfilePanel } from "./profile-sections.tsx";

type Profile = NonNullable<FunctionReturnType<typeof api.users.getProfile>>;

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <dt className="text-slate-400">{label}:</dt>
      <dd className="truncate text-right text-slate-200">{value ?? "-"}</dd>
    </div>
  );
}

/** Overview's first card: followers, following, bio and details (more behind Show more). */
export default function ProfileAbout({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const d = profile.sellerDetails;
  return (
    <ProfilePanel title={`About ${profile.name}`}>
      <p className="-mt-2 text-sm text-slate-300">
        {profile.stats.followerCount} Followers · {profile.counts.following} Following
      </p>
      {profile.bio && (
        <p className="whitespace-pre-line break-words border-t border-white/[0.06] pt-4 text-slate-300">
          {profile.bio}
        </p>
      )}
      <dl className="border-t border-white/[0.06] pt-3">
        <Detail label="Gender" value={d.gender} />
        <Detail label="Age" value={d.ageRange} />
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex cursor-pointer items-center gap-1 py-1 text-sm text-slate-400 hover:text-slate-200"
        >
          {open ? "Hide" : "Show more"}
          <ChevronDown className={cn("size-4 text-violet-500 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="mt-1 border-t border-white/[0.06] pt-2">
            <Detail label="Ethnicity" value={d.ethnicity} />
            <Detail label="Body Size" value={d.bodySize} />
            <Detail label="Joined" value={format(profile.memberSince, "MMM yyyy")} />
            <Detail label="Profile Visits" value={profile.activity.profileVisits.toLocaleString("en-US")} />
          </div>
        )}
      </dl>
    </ProfilePanel>
  );
}
