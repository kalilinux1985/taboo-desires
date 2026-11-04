"use client";

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
} from "@/lib/backend/react.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import ActivityFeed from "./home/_components/activity-feed.tsx";
import ShopLanding from "./home/_components/shop-landing.tsx";

export default function Index() {
  return (
    <>
      <AuthLoading>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8">
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AuthLoading>
      {/* Signed-in members land on the community activity feed */}
      <Authenticated>
        <ActivityFeed />
      </Authenticated>
      {/* Visitors land on the shop: filters, listings and sell/buy calls to action */}
      <Unauthenticated>
        <ShopLanding />
      </Unauthenticated>
    </>
  );
}
