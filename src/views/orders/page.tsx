"use client";

import Link from "next/link";
import { Compass, Package, ShoppingBag, Store } from "lucide-react";
import { useSearchParams } from "@/lib/navigation.ts";
import { usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
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
import OrderCard from "./_components/order-card.tsx";

type Role = "buyer" | "seller";

const EMPTY = {
  seller: {
    icon: Store,
    title: "No sales yet",
    description:
      "When you mark a listing as sold to a buyer, win an auction sale, or accept a custom request, the order shows up here so you can print a prepaid label.",
  },
  buyer: {
    icon: ShoppingBag,
    title: "No purchases yet",
    description: "Items you buy, win at auction, or get made as a custom show up here with their tracking.",
  },
} as const;

function OrderList({ role }: { role: Role }) {
  const { results, status, loadMore } = usePaginatedQuery(api.orders.list, { role }, { initialNumItems: 20 });
  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full" />
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
              <Link href="/shop">
                <Compass /> Browse the shop
              </Link>
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {results.map((o) => (
        <OrderCard key={o._id} order={o} />
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

function OrdersInner() {
  const me = useQuery(api.users.getCurrentUser, {});
  const [params, setParams] = useSearchParams();
  if (me === undefined) return <Skeleton className="h-44 w-full" />;
  if (me === null) return null;

  // Buyers only buy and sellers only sell; admins see both
  if (me.role !== "admin") return <OrderList role={me.accountType === "seller" ? "seller" : "buyer"} />;
  const tab = params.get("tab") === "purchases" ? "purchases" : "sales";
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setParams(v === "purchases" ? { tab: "purchases" } : {}, { replace: true })}
      className="gap-6"
    >
      <TabsList>
        <TabsTrigger value="sales" className="cursor-pointer">
          <Store /> Sales
        </TabsTrigger>
        <TabsTrigger value="purchases" className="cursor-pointer">
          <Package /> Purchases
        </TabsTrigger>
      </TabsList>
      <TabsContent value="sales">
        <OrderList role="seller" />
      </TabsContent>
      <TabsContent value="purchases">
        <OrderList role="buyer" />
      </TabsContent>
    </Tabs>
  );
}

export default function OrdersPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Purchases & sales</p>
        <h1 className="font-display text-4xl md:text-6xl">Orders</h1>
      </header>
      <RequireAuth message="Sign in to see your orders.">
        <OrdersInner />
      </RequireAuth>
    </div>
  );
}
