"use client";

import Link from "next/link";
import { useSearchParams } from "@/lib/navigation.ts";
import { Authenticated, AuthLoading, Unauthenticated, usePaginatedQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNow } from "date-fns";
import { Crown, MessagesSquare } from "lucide-react";
import { useAccess } from "@/hooks/use-access.ts";
import { api } from "@/lib/backend/api.ts";
import { FORUM_TOPICS, topicLabel, type ForumTopic } from "@/shared/forum.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import NewThreadDialog from "./_components/new-thread-dialog.tsx";
import AuthorChip from "./_components/author-chip.tsx";

function isTopic(value: string | null): value is ForumTopic {
  return FORUM_TOPICS.some((t) => t.id === value);
}

function CanPostStart({ topic }: { topic?: ForumTopic }) {
  const access = useAccess();
  if (access === undefined) return <Skeleton className="h-9 w-44" />;
  if (access?.can.post) return <NewThreadDialog defaultTopic={topic} />;
  return (
    <Button asChild variant="secondary" className="cursor-pointer">
      <Link href="/pricing">
        <Crown /> Go Pro to post
      </Link>
    </Button>
  );
}

function StartButton({ topic }: { topic?: ForumTopic }) {
  return (
    <>
      <AuthLoading>
        <Skeleton className="h-9 w-44" />
      </AuthLoading>
      <Unauthenticated>
        <SignInButton size="sm" />
      </Unauthenticated>
      <Authenticated>
        <CanPostStart topic={topic} />
      </Authenticated>
    </>
  );
}

function ThreadList({ topic }: { topic?: ForumTopic }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.forum.listThreads,
    { topic },
    { initialNumItems: 25 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (results.length === 0 && status === "Exhausted") {
    return (
      <Empty className="rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessagesSquare />
          </EmptyMedia>
          <EmptyTitle>No discussions yet</EmptyTitle>
          <EmptyDescription>Be the first to start a conversation here.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <StartButton topic={topic} />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((t) => (
        <article
          key={t._id}
          className="group relative rounded-xl border border-white/10 bg-card shadow-[inset_4px_4px_14px_-4px_var(--color-violet-800)] p-4 transition-colors hover:border-primary/60"
        >
          <div className="flex flex-wrap items-center gap-2 pb-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{topicLabel(t.topic)}</Badge>
            <span>active {formatDistanceToNow(new Date(t.lastActivityAt), { addSuffix: true })}</span>
          </div>
          <Link
            href={`/community/${t._id}`}
            className="cursor-pointer after:absolute after:inset-0"
          >
            <h2 className="font-display text-xl leading-snug group-hover:text-violet-400">{t.title}</h2>
          </Link>
          <p className="line-clamp-2 pt-1 text-sm text-muted-foreground">{t.preview}</p>
          <div className="flex items-center justify-between gap-3 pt-3">
            {/* Above the card-wide link so the author stays clickable */}
            <div className="relative z-10 min-w-0">
              <AuthorChip author={t.author} />
            </div>
            <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
              <MessagesSquare className="size-4" /> {t.replyCount}
            </span>
          </div>
        </article>
      ))}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            className="cursor-pointer"
            disabled={status === "LoadingMore"}
            onClick={() => loadMore(25)}
          >
            {status === "LoadingMore" && <Spinner />} Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("topic");
  const topic = isTopic(raw) ? raw : undefined;
  const tabs = [{ id: undefined, label: "All", blurb: "" }, ...FORUM_TOPICS];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="w-fit bg-accent px-2 py-1 font-mono text-xs font-bold uppercase tracking-widest text-accent-foreground">
        Community
      </p>
      <div className="flex flex-col gap-4 pb-6 pt-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-5xl md:text-6xl">Discussions</h1>
          <p className="max-w-xl pt-2 text-muted-foreground">
            Swap tips, meet sellers and buyers, and talk shop. Be kind and keep it 18+.
          </p>
        </div>
        <StartButton topic={topic} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-6">
        {tabs.map((t) => {
          const active = t.id === topic;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => setParams(t.id ? { topic: t.id } : {})}
              title={t.blurb || undefined}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:border-primary/60 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <ThreadList topic={topic} />
    </div>
  );
}
