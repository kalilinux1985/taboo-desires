import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
import { format, formatDistanceToNow } from "date-fns";
import { Crown, Inbox, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { APPROVAL_MONTHS } from "@/shared/plans.ts";
import RequireAuth from "@/components/require-auth.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import VerificationQueue from "./_components/verification-queue.tsx";

type Tab = "pending" | "active" | "verify";

function useRun() {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
    } catch (e) {
      toast.error(getErrorMessage(e, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function ApproveControls({ subscriptionId, pending }: { subscriptionId: Id<"subscriptions">; pending: boolean }) {
  const approve = useMutation(api.subscriptions.approve);
  const decline = useMutation(api.subscriptions.decline);
  const revoke = useMutation(api.subscriptions.revoke);
  const [months, setMonths] = useState("1");
  const { busy, run } = useRun();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={months} onValueChange={setMonths}>
        <SelectTrigger className="w-32" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APPROVAL_MONTHS.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {m} {m === 1 ? "month" : "months"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={busy}
        className="cursor-pointer"
        onClick={() =>
          run(() => approve({ subscriptionId, months: Number(months) }), pending ? "Pro approved" : "Pro extended")
        }
      >
        {busy && <Spinner />} {pending ? "Approve" : "Extend"}
      </Button>
      {pending ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          className="cursor-pointer"
          onClick={() => run(() => decline({ subscriptionId }), "Request declined")}
        >
          Decline
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          className="cursor-pointer text-destructive hover:text-destructive"
          onClick={() => run(() => revoke({ subscriptionId }), "Pro removed")}
        >
          Remove Pro
        </Button>
      )}
    </div>
  );
}

function SubscriptionList({ tab }: { tab: "pending" | "active" }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.subscriptions.adminList,
    { status: tab },
    { initialNumItems: 25 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (results.length === 0 && status === "Exhausted") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">{tab === "pending" ? <Inbox /> : <Crown />}</EmptyMedia>
          <EmptyTitle>{tab === "pending" ? "No requests waiting" : "No Pro sellers yet"}</EmptyTitle>
          <EmptyDescription>
            {tab === "pending"
              ? "New Pro requests from sellers will show up here."
              : "Approved sellers will show up here."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {results.map((s) => (
        <Card key={s._id} className="py-4">
          <CardContent className="flex flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/seller/${s.userId}`} className="cursor-pointer truncate font-semibold hover:underline">
                  {s.sellerName}
                </Link>
                {s.isCurrentlyPro && <Badge className="rounded-full">Pro</Badge>}
              </div>
              {s.email && <p className="truncate text-xs text-muted-foreground">{s.email}</p>}
              <p className="text-xs text-muted-foreground">
                {tab === "pending"
                  ? `Requested ${formatDistanceToNow(new Date(s.requestedAt), { addSuffix: true })}`
                  : s.expiresAt
                    ? `Pro until ${format(new Date(s.expiresAt), "MMM d, yyyy h:mm a")}`
                    : "No end date"}
                {tab === "pending" && s.isCurrentlyPro && s.expiresAt &&
                  ` · Pro until ${format(new Date(s.expiresAt), "MMM d, yyyy")}`}
              </p>
              {s.note && (
                <p className="mt-2 break-words rounded-md bg-muted px-3 py-2 text-sm">{s.note}</p>
              )}
            </div>
            <ApproveControls subscriptionId={s._id} pending={tab === "pending"} />
          </CardContent>
        </Card>
      ))}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button
          variant="secondary"
          className="cursor-pointer self-center"
          disabled={status === "LoadingMore"}
          onClick={() => loadMore(25)}
        >
          {status === "LoadingMore" && <Spinner />} Load more
        </Button>
      )}
    </div>
  );
}

function AdminInner() {
  const mine = useQuery(api.subscriptions.mine, {});
  const [tab, setTab] = useState<Tab>("pending");

  if (mine === undefined) return <Skeleton className="h-64 w-full" />;
  if (!mine?.isAdmin) {
    return (
      <Empty className="py-24">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldX />
          </EmptyMedia>
          <EmptyTitle>Admins only</EmptyTitle>
          <EmptyDescription>You don't have access to this page.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v === "active" || v === "verify" ? v : "pending")}>
        <TabsList>
          <TabsTrigger value="pending" className="cursor-pointer">Pro requests</TabsTrigger>
          <TabsTrigger value="active" className="cursor-pointer">Pro sellers</TabsTrigger>
          <TabsTrigger value="verify" className="cursor-pointer">Verification</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "verify" ? <VerificationQueue /> : <SubscriptionList tab={tab} />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-5xl">Admin</h1>
      <p className="pb-8 pt-2 text-muted-foreground">
        Approve Pro requests once you've received payment, and verify sellers.
      </p>
      <RequireAuth message="Sign in to manage seller plans.">
        <AdminInner />
      </RequireAuth>
    </div>
  );
}
