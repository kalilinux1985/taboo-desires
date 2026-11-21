"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import VerifiedBadge from "@/components/verified-badge.tsx";

/** Directory of sellers or buyers with a name search. */
export default function FindMembers({ accountType }: { accountType: "seller" | "buyer" }) {
  const [search, setSearch] = useState("");
  const members = useQuery(api.users.findMembers, { accountType, search: search.trim() || undefined });
  const title = accountType === "seller" ? "Find Sellers" : "Find Buyers";
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="pb-4 text-2xl font-bold text-white">{title}</h1>
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-violet-600" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${accountType}s by name`}
          aria-label={`Search ${accountType}s`}
          className="pl-9"
        />
      </div>
      {members === undefined ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-[5px]" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {accountType}s found.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {members.map((m) => (
            <Link
              key={m._id}
              href={`/seller/${m._id}`}
              className="flex flex-col items-center gap-2 rounded-[5px] p-2 text-center transition-colors hover:bg-white/5"
            >
              <ProfileAvatar name={m.name} url={m.avatarUrl} className="size-16 text-2xl" />
              <span className="flex max-w-full items-center gap-1 text-sm font-medium text-white">
                <span className="truncate">{m.name}</span>
                {m.verified && <VerifiedBadge />}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
