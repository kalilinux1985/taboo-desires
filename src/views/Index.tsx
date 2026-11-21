"use client";

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
} from "@/lib/backend/react.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import ActivityFeed from "./home/_components/activity-feed.tsx";
import Landing from "./home/_components/landing.tsx";

export default function Index() {
  return (
    <>
      <AuthLoading>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8">
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AuthLoading>
      {/* Signed-in members land on the activity feed */}
      <Authenticated>
        <ActivityFeed />
      </Authenticated>
      {/* Visitors, and members who just logged out, land on the home page */}
      <Unauthenticated>
        <Landing />
      </Unauthenticated>
    </>
  );
}
