import { useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNow } from "date-fns";
import { BadgeCheck, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { getErrorMessage } from "@/lib/listings.ts";

function ReviewControls({ verificationId }: { verificationId: Id<"verifications"> }) {
  const review = useMutation(api.verification.review);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      await review({ verificationId, approve, reason: approve ? undefined : reason });
      toast.success(approve ? "Seller verified" : "Request declined");
    } catch (e) {
      toast.error(getErrorMessage(e, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Reason if declining (shown to the seller)"
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} className="cursor-pointer" onClick={() => decide(true)}>
          {busy ? <Spinner /> : <BadgeCheck />} Verify
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          className="cursor-pointer"
          onClick={() => decide(false)}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}

export default function VerificationQueue() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.verification.adminPending,
    {},
    { initialNumItems: 20 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }
  if (results.length === 0 && status === "Exhausted") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BadgeCheck />
          </EmptyMedia>
          <EmptyTitle>No verifications waiting</EmptyTitle>
          <EmptyDescription>Seller verification photos will show up here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {results.map((r) => (
        <Card key={r._id} className="py-4">
          <CardContent className="flex flex-col gap-4 px-4 sm:flex-row">
            {r.photoUrl ? (
              <a href={r.photoUrl} target="_blank" rel="noreferrer" className="shrink-0 cursor-pointer">
                <img
                  src={r.photoUrl}
                  alt={`Verification photo from ${r.sellerName}`}
                  className="h-40 w-full rounded-md object-cover sm:w-40"
                />
              </a>
            ) : (
              <div className="flex h-40 w-full shrink-0 items-center justify-center rounded-md bg-muted sm:w-40">
                <ImageOff className="text-muted-foreground" />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/seller/${r.userId}`} className="cursor-pointer truncate font-semibold hover:underline">
                  {r.sellerName}
                </Link>
                {r.email && <p className="truncate text-xs text-muted-foreground">{r.email}</p>}
                <p className="text-xs text-muted-foreground">
                  Sent {formatDistanceToNow(new Date(r.requestedAt), { addSuffix: true })}. Check the
                  note shows the shop name and a recent date.
                </p>
              </div>
              <ReviewControls verificationId={r._id} />
            </div>
          </CardContent>
        </Card>
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
