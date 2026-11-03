"use client";

import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import Link from "next/link";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { ListingGrid } from "@/components/listing-card.tsx";

export default function AuctionsPage() {
  const query = usePaginatedQuery(api.auctions.endingSoon, {}, { initialNumItems: 24 });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="w-fit bg-accent px-2 py-1 font-mono text-xs font-bold uppercase tracking-widest text-accent-foreground">
        Live now
      </p>
      <h1 className="pt-3 font-display text-5xl md:text-7xl">Auctions</h1>
      <p className="max-w-xl pb-8 pt-2 text-muted-foreground">
        Ending soonest first. Highest bid wins, and late bids add two minutes so nobody gets sniped.
      </p>
      <ListingGrid
        query={query}
        emptyTitle="No live auctions"
        emptyDescription="Start one and let the bids decide the price."
        emptyAction={
          <Button asChild size="sm" className="cursor-pointer">
            <Link href="/sell">Start an auction</Link>
          </Button>
        }
      />
    </div>
  );
}
