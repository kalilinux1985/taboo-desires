"use client";

import Link from "next/link";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import VerifiedBadge from "@/components/verified-badge.tsx";
import HideOnError from "@/components/hide-on-error.tsx";

function Members({ search }: { search: string }) {
  const members = useQuery(api.users.search, { search });
  if (!members || members.length === 0) return null;
  return (
    <section aria-label="Members" className="pb-8">
      <h2 className="pb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Members
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {members.map((m) => (
          <Link
            key={m._id}
            href={`/seller/${m._id}`}
            className="flex w-24 shrink-0 flex-col items-center gap-2 text-center"
          >
            <ProfileAvatar name={m.name} url={m.avatarUrl} className="size-16 text-2xl" />
            <span className="flex max-w-full items-center gap-1 text-sm font-medium">
              <span className="truncate">{m.name}</span>
              {m.verified && <VerifiedBadge />}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Sellers matching the search box, shown above the matching listings. */
export default function MemberResults({ search }: { search: string }) {
  const term = search.trim();
  if (term.length < 2) return null;
  return (
    <HideOnError key={term}>
      <Members search={term} />
    </HideOnError>
  );
}
