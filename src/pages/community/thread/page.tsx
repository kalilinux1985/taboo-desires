import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "@/lib/backend/react.tsx";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, MessagesSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { REPLY_MAX, topicLabel } from "@/shared/forum.ts";
import { deniedMessage } from "@/shared/accounts.ts";
import { useAccess } from "@/hooks/use-access.ts";
import UpgradeNotice from "@/components/upgrade-notice.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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
import { getErrorMessage } from "@/lib/listings.ts";
import AuthorChip from "../_components/author-chip.tsx";
import ConfirmDelete from "../_components/confirm-delete.tsx";

function DeleteIconButton({ label }: { label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      className="cursor-pointer text-muted-foreground hover:text-destructive"
    >
      <Trash2 />
    </Button>
  );
}

function ReplyComposer({ threadId }: { threadId: Id<"threads"> }) {
  const access = useAccess();
  const reply = useMutation(api.forum.reply);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await reply({ threadId, body });
      setBody("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not post reply"));
    } finally {
      setSending(false);
    }
  };

  if (access === undefined) return <Skeleton className="h-32 w-full" />;
  if (!access?.can.post) {
    return <UpgradeNotice message={deniedMessage("post", access?.accountType ?? undefined)} />;
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-white/10 bg-card shadow-[inset_4px_4px_14px_-4px_var(--color-violet-800)] p-4">
      <Textarea
        rows={3}
        maxLength={REPLY_MAX}
        placeholder="Add to the discussion..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={!body.trim() || sending} className="cursor-pointer">
          {sending && <Spinner />} Reply
        </Button>
      </div>
    </form>
  );
}

function Replies({
  threadId,
  meId,
  isAdmin,
}: {
  threadId: Id<"threads">;
  meId: Id<"users"> | null;
  isAdmin: boolean;
}) {
  const deleteReply = useMutation(api.forum.deleteReply);
  const { results, status, loadMore } = usePaginatedQuery(
    api.forum.listReplies,
    { threadId },
    { initialNumItems: 30 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (results.length === 0 && status === "Exhausted") {
    return <p className="py-6 text-center text-sm text-muted-foreground">No replies yet. Start the conversation.</p>;
  }

  return (
    <div className="space-y-3">
      {results.map((r) => (
        <div key={r._id} className="rounded-xl border border-white/10 bg-card shadow-[inset_4px_4px_14px_-4px_var(--color-violet-800)]/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <AuthorChip author={r.author} />
              <span
                className="shrink-0 text-xs text-muted-foreground"
                title={format(r._creationTime, "PPpp")}
              >
                {formatDistanceToNow(r._creationTime, { addSuffix: true })}
              </span>
            </div>
            {(isAdmin || r.authorId === meId) && (
              <ConfirmDelete
                trigger={<DeleteIconButton label="Delete reply" />}
                title="Delete this reply?"
                description="This can't be undone."
                onConfirm={async () => {
                  try {
                    await deleteReply({ replyId: r._id });
                  } catch (e) {
                    toast.error(getErrorMessage(e, "Could not delete reply"));
                  }
                }}
              />
            )}
          </div>
          <p className="whitespace-pre-wrap break-words pt-2 text-sm leading-relaxed">{r.body}</p>
        </div>
      ))}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            className="cursor-pointer"
            disabled={status === "LoadingMore"}
            onClick={() => loadMore(30)}
          >
            {status === "LoadingMore" && <Spinner />} Load more replies
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const id = threadId as Id<"threads">;
  const thread = useQuery(api.forum.getThread, { threadId: id });
  const deleteThread = useMutation(api.forum.deleteThread);
  const navigate = useNavigate();

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 cursor-pointer">
      <Link to="/community">
        <ArrowLeft /> All discussions
      </Link>
    </Button>
  );

  if (thread === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (thread === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {back}
        <Empty className="py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessagesSquare />
            </EmptyMedia>
            <EmptyTitle>Discussion not found</EmptyTitle>
            <EmptyDescription>It may have been deleted.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {back}
      <article className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to={`/community?topic=${thread.topic}`} className="cursor-pointer">
            <Badge variant="secondary">{topicLabel(thread.topic)}</Badge>
          </Link>
          <span title={format(thread._creationTime, "PPpp")}>
            {formatDistanceToNow(thread._creationTime, { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 pt-3">
          <h1 className="font-display text-3xl leading-tight md:text-4xl">{thread.title}</h1>
          {thread.canDelete && (
            <ConfirmDelete
              trigger={<DeleteIconButton label="Delete discussion" />}
              title="Delete this discussion?"
              description="The post and all its replies will be removed. This can't be undone."
              onConfirm={async () => {
                try {
                  await deleteThread({ threadId: id });
                  toast.success("Discussion deleted");
                  navigate("/community");
                } catch (e) {
                  toast.error(getErrorMessage(e, "Could not delete discussion"));
                }
              }}
            />
          )}
        </div>
        <div className="pt-4">
          <AuthorChip author={thread.author} size="md" />
        </div>
        <p className="whitespace-pre-wrap break-words border-b pb-8 pt-5 leading-relaxed">
          {thread.body}
        </p>
      </article>

      <h2 className="pb-4 pt-8 font-display text-2xl">
        {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
      </h2>
      <Replies threadId={id} meId={thread.meId} isAdmin={thread.isAdmin} />

      <div className="pt-6">
        <AuthLoading>
          <Skeleton className="h-32 w-full" />
        </AuthLoading>
        <Unauthenticated>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">Sign in to join the discussion.</p>
            <SignInButton size="sm" />
          </div>
        </Unauthenticated>
        <Authenticated>
          <ReplyComposer threadId={id} />
        </Authenticated>
      </div>
    </div>
  );
}
