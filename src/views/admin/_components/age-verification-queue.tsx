import { useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNow } from "date-fns";
import { CircleCheck, ImageOff, ShieldCheck } from "lucide-react";
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

function Photo({ url, label }: { url: string | null; label: string }) {
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="block cursor-pointer">
      <img src={url} alt={label} className="h-48 w-full rounded-[1px] object-cover sm:w-56" />
      <span className="mt-1 block text-xs text-muted-foreground">{label} (tap to enlarge)</span>
    </a>
  ) : (
    <div className="flex h-48 w-full items-center justify-center rounded-[1px] bg-muted sm:w-56">
      <ImageOff className="text-muted-foreground" />
    </div>
  );
}

function ReviewControls({ verificationId }: { verificationId: Id<"ageVerifications"> }) {
  const review = useMutation(api.ageVerification.review);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      await review({ verificationId, approve, reason: approve ? undefined : reason });
      toast.success(approve ? "Age verified" : "Declined");
    } catch (e) {
      toast.error(getErrorMessage(e, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Reason if declining (shown to the member)"
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} className="cursor-pointer" onClick={() => decide(true)}>
          {busy ? <Spinner /> : <CircleCheck />} Approve 18+
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} className="cursor-pointer" onClick={() => decide(false)}>
          Decline
        </Button>
      </div>
    </div>
  );
}

/** Admin queue of age checks: ID photo, selfie and date of birth side by side. */
export default function AgeVerificationQueue() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.ageVerification.adminPending,
    {},
    { initialNumItems: 20 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
    );
  }
  if (results.length === 0 && status === "Exhausted") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldCheck />
          </EmptyMedia>
          <EmptyTitle>No age checks waiting</EmptyTitle>
          <EmptyDescription>ID photos and selfies will show up here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {results.map((r) => (
        <Card key={r._id} className="py-4">
          <CardContent className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <Photo url={r.idUrl} label="Government ID" />
              <Photo url={r.selfieUrl} label="Selfie with ID" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/seller/${r.userId}`} className="cursor-pointer truncate font-semibold hover:underline">
                  {r.memberName}
                </Link>
                {r.email && <p className="truncate text-xs text-muted-foreground">{r.email}</p>}
                <p className="text-xs capitalize text-muted-foreground">{r.accountType ?? "No account type"}</p>
                <p className="mt-2 text-sm">
                  Date of birth: <span className="font-bold">{r.birthDate ?? "—"}</span>
                  {r.age !== null && <span className="text-muted-foreground"> (age {r.age})</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sent {formatDistanceToNow(new Date(r.requestedAt), { addSuffix: true })}. Check the ID is real
                  and unexpired, the date of birth matches what they entered, and the selfie shows the same
                  person holding that ID.
                </p>
              </div>
            </div>
            <ReviewControls verificationId={r._id} />
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
