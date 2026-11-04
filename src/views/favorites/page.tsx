"use client";

import Link from "next/link";
import { usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
import { Compass } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ListingGrid } from "@/components/listing-card.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import RequireAuth from "@/components/require-auth.tsx";
import VerifiedBadge from "@/components/verified-badge.tsx";

function FollowedSellers() {
  const sellers = useQuery(api.favorites.followedSellers, {});
  if (sellers === undefined) {
    return (
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="size-20 rounded-full" />
        ))}
      </div>
    );
  }
  if (sellers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You're not following any sellers yet. Tap Follow on a shop to keep it here.
      </p>
    );
  }
  return (
    <div className="flex gap-5 overflow-x-auto pb-2">
      {sellers.map((s) => (
        <Link
          key={s._id}
          href={`/seller/${s._id}`}
          className="flex w-20 shrink-0 cursor-pointer flex-col items-center gap-2 text-center"
        >
          <ProfileAvatar name={s.name} url={s.avatarUrl} className="size-16 text-3xl ring-2 ring-primary/40" />
          <span className="flex w-full items-center justify-center gap-1 text-xs font-semibold">
            <span className="truncate">{s.name}</span>
            {s.verified && <VerifiedBadge />}
          </span>
        </Link>
      ))}
    </div>
  );
}

function SavedListings() {
  const query = usePaginatedQuery(api.favorites.mine, {}, { initialNumItems: 24 });
  return (
    <ListingGrid
      query={query}
      emptyTitle="No saved listings"
      emptyDescription="Tap the heart on any listing to save it for later."
      emptyAction={
        <Button asChild size="sm" className="cursor-pointer">
          <Link href="/browse">
            <Compass /> Browse listings
          </Link>
        </Button>
      }
    />
  );
}

export default function FavoritesPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Saved</p>
        <h1 className="font-display text-4xl md:text-6xl">Favorites</h1>
        <p className="text-muted-foreground">Listings you've saved and the sellers you follow.</p>
      </header>
      <RequireAuth message="Sign in to see your saved listings and sellers.">
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl">Sellers</h2>
          <FollowedSellers />
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl">Listings</h2>
          <SavedListings />
        </section>
      </RequireAuth>
    </div>
  );
}
