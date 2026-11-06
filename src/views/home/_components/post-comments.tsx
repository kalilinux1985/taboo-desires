import { useState } from "react";
import { usePaginatedQuery, useMutation } from "@/lib/backend/react.tsx";
import { Authenticated, Unauthenticated } from "@/lib/backend/react.tsx";
import Link from "next/link";
import { SendHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType, Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { shortAge } from "../_lib/feed.ts";
import { useUpgradeGate } from "@/hooks/use-upgrade-gate.ts";

type Comment = FunctionReturnType<typeof api.posts.listComments>["page"][number];

function CommentForm({
  postId,
  parentId,
  placeholder = "Add a comment...",
  autoFocus,
  onDone,
}: {
  postId: Id<"posts">;
  parentId?: Id<"postComments">;
  placeholder?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const add = useMutation(api.posts.addComment);
  const { blockAndRedirect } = useUpgradeGate();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    if (blockAndRedirect("post")) return;
    setSending(true);
    try {
      await add({ postId, body, parentId });
      setBody("");
      onDone?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not comment"));
    } finally {
      setSending(false);
    }
  };
  return (
    <form onSubmit={submit} className="relative flex-1">
      <Input
        value={body}
        maxLength={500}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => setBody(e.target.value)}
        className="h-10 border-white/10 bg-white/[0.03] pr-10"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={!body.trim() || sending}
        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-violet-500 disabled:opacity-40"
      >
        {sending ? <Spinner /> : <SendHorizontal className="size-4" />}
      </button>
    </form>
  );
}

function CommentItem({
  postId,
  comment,
  threadId,
}: {
  postId: Id<"posts">;
  comment: Comment;
  /** The top-level comment this one belongs to (itself for top-level) */
  threadId: Id<"postComments">;
}) {
  const toggleLike = useMutation(api.posts.toggleCommentLike);
  const remove = useMutation(api.posts.removeComment);
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const isTop = threadId === comment._id;
  const profile = `/seller/${comment.author._id}`;

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        <Link href={profile} className="shrink-0 cursor-pointer">
          <ProfileAvatar name={comment.author.name} url={comment.author.avatarUrl} className="size-8 rounded-sm text-sm" />
        </Link>
        <div className="min-w-0 flex-1 rounded-sm border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <p className="flex items-baseline justify-between gap-2 text-sm">
            <Link href={profile} className="cursor-pointer truncate font-semibold hover:underline">
              {comment.author.name}
            </Link>
            <span className="shrink-0 text-xs text-muted-foreground">{shortAge(comment._creationTime)}</span>
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{comment.body}</p>
        </div>
        {comment.canDelete && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete comment"
            className="size-7 cursor-pointer text-muted-foreground"
            onClick={() => remove({ commentId: comment._id }).catch((e) => toast.error(getErrorMessage(e, "Could not delete")))}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="ml-11 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <button
          type="button"
          aria-pressed={comment.likedByMe}
          onClick={() => toggleLike({ commentId: comment._id }).catch((e) => toast.error(getErrorMessage(e, "Sign in to like comments")))}
          className={cn("cursor-pointer hover:text-foreground", comment.likedByMe && "font-semibold text-violet-400")}
        >
          Like{comment.likeCount > 0 && ` · ${comment.likeCount}`}
        </button>
        <Authenticated>
          <button type="button" onClick={() => setReplying((r) => !r)} className="cursor-pointer hover:text-foreground">
            Reply
          </button>
        </Authenticated>
        {isTop && comment.replyCount > 0 && (
          <button type="button" onClick={() => setShowReplies((s) => !s)} className="cursor-pointer hover:text-foreground">
            {showReplies ? "Hide replies" : `View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
          </button>
        )}
      </div>

      {replying && (
        <div className="ml-11 flex">
          <CommentForm
            postId={postId}
            parentId={threadId}
            autoFocus
            placeholder={`Reply to ${comment.author.name}...`}
            onDone={() => {
              setReplying(false);
              setShowReplies(true);
            }}
          />
        </div>
      )}
      {isTop && showReplies && <Replies postId={postId} parentId={comment._id} />}
    </li>
  );
}

function Replies({ postId, parentId }: { postId: Id<"posts">; parentId: Id<"postComments"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.listComments,
    { postId, parentId },
    { initialNumItems: 10 },
  );
  if (status === "LoadingFirstPage") return <Skeleton className="ml-11 h-10" />;
  return (
    <ul className="ml-11 flex flex-col gap-3">
      {results.map((r) => (
        <CommentItem key={r._id} postId={postId} comment={r} threadId={parentId} />
      ))}
      {status === "CanLoadMore" && (
        <Button variant="ghost" size="sm" onClick={() => loadMore(10)} className="cursor-pointer self-start">
          More replies
        </Button>
      )}
    </ul>
  );
}

/** Comment thread under a post, with likes and one level of replies. */
export default function PostComments({
  postId,
  className,
}: {
  postId: Id<"posts">;
  className?: string;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.listComments,
    { postId },
    { initialNumItems: 10 },
  );

  return (
    <div className={cn("flex flex-col gap-4 rounded-lg bg-background/50 p-3", className)}>
      <Authenticated>
        <div className="flex">
          <CommentForm postId={postId} />
        </div>
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          Sign in to comment.
          <SignInButton size="sm" />
        </div>
      </Unauthenticated>

      {status === "LoadingFirstPage" ? (
        <Skeleton className="h-10 w-full" />
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {results.map((c) => (
            <CommentItem key={c._id} postId={postId} comment={c} threadId={c._id} />
          ))}
        </ul>
      )}
      {status === "CanLoadMore" && (
        <Button variant="ghost" size="sm" onClick={() => loadMore(10)} className="cursor-pointer self-start">
          Show older comments
        </Button>
      )}
    </div>
  );
}
