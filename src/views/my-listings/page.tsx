"use client";

import Link from "next/link";
import { useQuery } from "@/lib/backend/react.tsx";
import { ExternalLink, Plus, Store } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import RequireAuth from "@/components/require-auth.tsx";
import SellerListings from "@/components/seller-listings.tsx";

function MyListingsInner() {
  const me = useQuery(api.users.menu, {});
  if (me === undefined) return <Skeleton className="h-64 w-full" />;
  if (me === null) return null;
  if (me.accountType !== "seller" && !me.isAdmin) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Store />
          </EmptyMedia>
          <EmptyTitle>Listings are for sellers</EmptyTitle>
          <EmptyDescription>Your account is set up for buying.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm" className="cursor-pointer">
            <Link href="/browse">Browse listings</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="cursor-pointer">
          <Link href="/sell">
            <Plus /> Sell an item
          </Link>
        </Button>
        <Button asChild size="sm" variant="secondary" className="cursor-pointer">
          <Link href="/shop">
            <ExternalLink /> View my shop
          </Link>
        </Button>
      </div>
      <SellerListings sellerId={me._id} isMe />
    </div>
  );
}

export default function MyListingsPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Seller tools</p>
        <h1 className="font-display text-4xl md:text-6xl">My listings</h1>
      </header>
      <RequireAuth message="Sign in to manage your listings.">
        <MyListingsInner />
      </RequireAuth>
    </div>
  );
}
