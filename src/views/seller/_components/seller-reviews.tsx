import { useState } from "react";
import { Authenticated, useMutation, usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNow } from "date-fns";
import { MessageSquareQuote, PenLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { RatingSummary, StarInput, Stars } from "@/components/star-rating.tsx";
import { getErrorMessage } from "@/lib/listings.ts";

type Existing = { rating: number; body: string } | null;

function ReviewDialog({
  sellerId,
  sellerName,
  existing,
  open,
  onOpenChange,
}: {
  sellerId: Id<"users">;
  sellerName: string;
  existing: Existing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useMutation(api.reviews.save);
  const remove = useMutation(api.reviews.remove);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not save review"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit your review" : `Review ${sellerName}`}</DialogTitle>
          <DialogDescription>Your name and review will be public on this shop.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <StarInput value={rating} onChange={setRating} />
          <div className="grid gap-2">
            <Label htmlFor="review-body">Your review</Label>
            <Textarea
              id="review-body"
              rows={4}
              maxLength={1000}
              placeholder="Fast replies, discreet packaging, exactly as described."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {existing && (
            <Button
              variant="ghost"
              disabled={busy}
              className="cursor-pointer text-destructive hover:text-destructive sm:mr-auto"
              onClick={() => run(() => remove({ sellerId }), "Review deleted")}
            >
              <Trash2 /> Delete
            </Button>
          )}
          <Button
            disabled={busy || rating < 1}
            className="cursor-pointer"
            onClick={() => run(() => save({ sellerId, rating, body }), "Thanks for your review")}
          >
            {busy && <Spinner />} {existing ? "Update review" : "Post review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WriteReview({ sellerId, sellerName }: { sellerId: Id<"users">; sellerName: string }) {
  const mine = useQuery(api.reviews.myReview, { sellerId });
  const [open, setOpen] = useState(false);
  if (!mine?.eligible) return null;
  return (
    <>
      <Button size="sm" className="cursor-pointer" onClick={() => setOpen(true)}>
        <PenLine /> {mine.review ? "Edit your review" : "Write a review"}
      </Button>
      {/* Remount on open so the form starts from the saved review */}
      {open && (
        <ReviewDialog
          sellerId={sellerId}
          sellerName={sellerName}
          existing={mine.review}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}

export default function SellerReviews({
  sellerId,
  sellerName,
  isMe,
  rating,
  reviewCount,
}: {
  sellerId: Id<"users">;
  sellerName: string;
  isMe: boolean;
  rating: number | null;
  reviewCount: number;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.reviews.listForSeller,
    { sellerId },
    { initialNumItems: 10 },
  );

  return (
    <section className="flex flex-col gap-6" id="reviews">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-3xl">Reviews</h2>
          <RatingSummary rating={rating} reviewCount={reviewCount} />
        </div>
        {!isMe && (
          <Authenticated>
            <WriteReview sellerId={sellerId} sellerName={sellerName} />
          </Authenticated>
        )}
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : results.length === 0 && status === "Exhausted" ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareQuote />
            </EmptyMedia>
            <EmptyTitle>No reviews yet</EmptyTitle>
            <EmptyDescription>
              {isMe
                ? "Buyers you've chatted with or sold to can leave a review here."
                : "Message or buy from this seller to leave the first review."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map((r) => (
            <article key={r._id} className="flex flex-col gap-3 rounded-md border border-[#383b3d]/90 bg-card shadow-[inset_4px_4px_14px_-4px_var(--color-violet-800)] p-4">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={r.reviewer ? `/seller/${r.reviewer._id}` : "#"}
                  className="flex min-w-0 cursor-pointer items-center gap-2"
                >
                  <ProfileAvatar
                    name={r.reviewer?.name ?? "?"}
                    url={r.reviewer?.avatarUrl ?? null}
                    className="size-8 text-base"
                  />
                  <span className="truncate font-semibold">{r.reviewer?.name ?? "Former member"}</span>
                </Link>
                <Stars rating={r.rating} className="shrink-0" />
              </div>
              {r.body && <p className="whitespace-pre-wrap break-words text-sm">{r.body}</p>}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
              </p>
            </article>
          ))}
        </div>
      )}

      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => loadMore(10)}
            disabled={status === "LoadingMore"}
            className="cursor-pointer"
          >
            {status === "LoadingMore" && <Spinner />} More reviews
          </Button>
        </div>
      )}
    </section>
  );
}
