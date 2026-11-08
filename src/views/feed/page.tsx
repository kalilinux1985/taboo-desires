"use client";

import Link from "next/link";
import { useQuery } from "@/lib/backend/react.tsx";
import { Compass, Heart } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { ListingCard, ListingGridSkeleton } from "@/components/listing-card.tsx";
import RequireAuth from "@/components/require-auth.tsx";

function FeedInner() {
  const feed = useQuery(api.follows.feed, {});
  if (feed === undefined) return <ListingGridSkeleton />;

  if (feed.listings.length === 0) {
    const noFollows = feed.followingCount === 0;
    return (
      <Empty className="border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Heart />
          </EmptyMedia>
          <EmptyTitle>{noFollows ? "You're not following anyone yet" : "Nothing new yet"}</EmptyTitle>
          <EmptyDescription>
            {noFollows
              ? "Tap Follow on a seller's shop and their new listings will land here."
              : "Sellers you follow haven't listed anything right now. Check back soon."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm" className="cursor-pointer">
            <Link href="/browse">
              <Compass /> Discover sellers
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {feed.listings.map((l) => (
        <ListingCard key={l._id} listing={l} />
      ))}
    </div>
  );
}

export default function FeedPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Your feed</p>
        <h1 className="font-display text-4xl md:text-6xl">Following</h1>
        <p className="text-muted-foreground">The newest listings from sellers you follow.</p>
      </header>
      <RequireAuth message="Sign in to see listings from sellers you follow.">
        <FeedInner />
      </RequireAuth>
    </div>
  );
}
