import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNow } from "date-fns";
import { MessageSquareQuote } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { Stars } from "@/components/star-rating.tsx";

/** Reviews this buyer has left for sellers. */
export default function BuyerReviews({ buyerId, isMe }: { buyerId: Id<"users">; isMe: boolean }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.reviews.listByReviewer,
    { reviewerId: buyerId },
    { initialNumItems: 10 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-3xl">Reviews</h2>
      {results.length === 0 && status === "Exhausted" ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareQuote />
            </EmptyMedia>
            <EmptyTitle>No reviews yet</EmptyTitle>
            <EmptyDescription>
              {isMe ? "Reviews you leave for sellers show up here." : "This buyer hasn't reviewed anyone yet."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map((r) => (
            <article
              key={r._id}
              className="flex flex-col gap-3 rounded-md border border-white/10 bg-card p-4 shadow-[inset_4px_4px_14px_-4px_var(--color-violet-800)]"
            >
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={r.seller ? `/seller/${r.seller._id}` : "#"}
                  className="flex min-w-0 cursor-pointer items-center gap-2"
                >
                  <ProfileAvatar name={r.seller?.name ?? "?"} url={r.seller?.avatarUrl ?? null} className="size-8 text-base" />
                  <span className="truncate text-sm">
                    <span className="text-muted-foreground">Reviewed </span>
                    <span className="font-semibold">{r.seller?.name ?? "Former member"}</span>
                  </span>
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
