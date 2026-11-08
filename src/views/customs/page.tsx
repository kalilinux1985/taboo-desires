"use client";

import Link from "next/link";
import { useSearchParams } from "@/lib/navigation.ts";
import { usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
import { Compass, Inbox, Send } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import RequireAuth from "@/components/require-auth.tsx";
import RequestCard from "./_components/request-card.tsx";

type Role = "buyer" | "seller";

const EMPTY = {
  seller: {
    icon: Inbox,
    title: "No custom requests yet",
    description: "When a buyer asks you for a custom item, it shows up here.",
  },
  buyer: {
    icon: Send,
    title: "You haven't sent any requests",
    description: "Open a seller's profile and tap \"Request a custom\" to ask for something made just for you.",
  },
} as const;

function RequestList({ role }: { role: Role }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.customRequests.list,
    { role },
    { initialNumItems: 20 },
  );
  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-60 w-full" />
        ))}
      </div>
    );
  }
  if (results.length === 0 && status === "Exhausted") {
    const e = EMPTY[role];
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <e.icon />
          </EmptyMedia>
          <EmptyTitle>{e.title}</EmptyTitle>
          <EmptyDescription>{e.description}</EmptyDescription>
        </EmptyHeader>
        {role === "buyer" && (
          <EmptyContent>
            <Button asChild size="sm" className="cursor-pointer">
              <Link href="/browse">
                <Compass /> Find a seller
              </Link>
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {results.map((r) => (
        <RequestCard key={r._id} request={r} role={role} />
      ))}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button
          variant="secondary"
          className="cursor-pointer self-center"
          disabled={status === "LoadingMore"}
          onClick={() => loadMore(20)}
        >
          {status === "LoadingMore" && <Spinner />} Load more
        </Button>
      )}
    </div>
  );
}

function CustomsInner() {
  const me = useQuery(api.users.getCurrentUser, {});
  const [params, setParams] = useSearchParams();
  if (me === undefined) return <Skeleton className="h-60 w-full" />;
  if (me === null) return null;

  // Buyers only send requests and sellers only receive them; admins see both
  if (me.role !== "admin") return <RequestList role={me.accountType === "seller" ? "seller" : "buyer"} />;
  const tab = params.get("tab") === "sent" ? "sent" : "received";
  return (
    <Tabs value={tab} onValueChange={(v) => setParams(v === "sent" ? { tab: "sent" } : {}, { replace: true })} className="gap-6">
      <TabsList>
        <TabsTrigger value="received" className="cursor-pointer">
          <Inbox /> Received
        </TabsTrigger>
        <TabsTrigger value="sent" className="cursor-pointer">
          <Send /> Sent
        </TabsTrigger>
      </TabsList>
      <TabsContent value="received">
        <RequestList role="seller" />
      </TabsContent>
      <TabsContent value="sent">
        <RequestList role="buyer" />
      </TabsContent>
    </Tabs>
  );
}

export default function CustomsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Made just for you</p>
        <h1 className="font-display text-4xl md:text-6xl">Custom requests</h1>
      </header>
      <RequireAuth message="Sign in to see your custom requests.">
        <CustomsInner />
      </RequireAuth>
    </div>
  );
}
