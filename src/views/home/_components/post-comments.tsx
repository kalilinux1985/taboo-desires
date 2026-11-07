import { useState } from "react";
import { usePaginatedQuery, useMutation } from "@/lib/backend/react.tsx";
import { Authenticated, Unauthenticated } from "@/lib/backend/react.tsx";
import Link from "next/link";
import { ChevronRight, Heart, Medal, Reply, SendHorizontal, Trash2 } from "lucide-react";
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
import { useUpgradeGate } from "@/hooks/use-upgrade-gate.ts";
import LikerAvatars from "./liker-avatars.tsx";

type Comment = FunctionReturnType<typeof api.posts.listComments>["page"][number];

function CommentForm({
  postId,
  parentId,
  placeholder = "Add a comment...",
  initial = "",
  autoFocus,
  onDone,
}: {
  postId: Id<"posts">;
  parentId?: Id<"postComments">;
  placeholder?: string;
  /** Starting text, such as "@Name " when replying */
  initial?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const add = useMutation(api.posts.addComment);
  const { blockAndRedirect } = useUpgradeGate();
  const [body, setBody] = useState(initial);
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
        className="h-11 border-white/10 bg-background/60 pr-10"
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
    <li className="flex flex-col gap-3 border-b border-white/10 py-4 last:border-b-0">
      <div className="flex items-start gap-3 sm:gap-5">
        <Link href={profile} className="shrink-0 cursor-pointer">
          <ProfileAvatar
            name={comment.author.name}
            url={comment.author.avatarUrl}
            className="size-12 border-2 border-white/15 text-xl sm:size-16 sm:text-2xl"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <p className="whitespace-pre-wrap break-words text-base text-foreground/90 sm:text-xl">
            <Link href={profile} className="mr-1.5 cursor-pointer font-bold text-foreground hover:underline">
              {comment.author.name}
            </Link>
            {comment.body}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground sm:text-lg">
            <Authenticated>
              <button
                type="button"
                aria-label={`Reply to ${comment.author.name}`}
                onClick={() => setReplying((r) => !r)}
                className={cn("cursor-pointer hover:text-foreground", replying && "text-violet-400")}
              >
                <Reply className="size-5" />
              </button>
            </Authenticated>
            <button
              type="button"
              aria-pressed={comment.likedByMe}
              aria-label={comment.likedByMe ? "Unlike comment" : "Like comment"}
              onClick={() =>
                toggleLike({ commentId: comment._id }).catch((e) => toast.error(getErrorMessage(e, "Sign in to like comments")))
              }
              className={cn("flex cursor-pointer items-center gap-1.5 hover:text-foreground", comment.likedByMe && "text-violet-400")}
            >
              <Heart className={cn("size-5", comment.likedByMe && "fill-violet-500 text-violet-500")} /> {comment.likeCount}
            </button>
            <LikerAvatars likers={comment.likers} total={comment.likeCount} size="sm" />
            {isTop && comment.replyCount > 0 && (
              <button
                type="button"
                onClick={() => setShowReplies((s) => !s)}
                className="flex cursor-pointer items-center gap-0.5 text-sm text-violet-400 hover:underline"
              >
                {showReplies ? "Hide replies" : `${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
                <ChevronRight className={cn("size-4 transition-transform", showReplies && "rotate-90")} />
              </button>
            )}
          </div>
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

      {replying && (
        <div className="ml-15 flex sm:ml-21">
          <CommentForm
            postId={postId}
            parentId={threadId}
            autoFocus
            initial={`@${comment.author.name} `}
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
  if (status === "LoadingFirstPage") return <Skeleton className="ml-15 h-10 sm:ml-21" />;
  return (
    <ul className="ml-15 flex flex-col border-l border-white/10 pl-3 sm:ml-21">
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

/** Shown instead of the comment box to sellers without Premium. */
function PremiumNotice() {
  return (
    <p className="rounded-md border border-violet-500/40 bg-violet-500/10 px-5 py-4 text-center text-base text-violet-100 sm:text-xl">
      Adding comments to the activity feed is a Premium Seller feature.{" "}
      <Link href="/pricing?for=post" className="inline-flex cursor-pointer items-center gap-1 font-bold text-violet-300 hover:underline">
        <Medal className="size-5 text-rose-400" /> Go Premium &gt;
      </Link>
    </p>
  );
}

/** Comment box (or the Premium notice) in a grey band, then the comments with likes and replies. */
export default function PostComments({
  postId,
  className,
}: {
  postId: Id<"posts">;
  className?: string;
}) {
  const { needsUpgrade } = useUpgradeGate();
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.listComments,
    { postId },
    { initialNumItems: 5 },
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="border-y border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <Authenticated>
          {needsUpgrade("post") ? (
            <PremiumNotice />
          ) : (
            <div className="flex">
              <CommentForm postId={postId} />
            </div>
          )}
        </Authenticated>
        <Unauthenticated>
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            Sign in to comment.
            <SignInButton size="sm" />
          </div>
        </Unauthenticated>
      </div>

      {status === "LoadingFirstPage" ? (
        <Skeleton className="mt-4 h-16 w-full" />
      ) : (
        results.length > 0 && (
          <ul className="flex flex-col">
            {results.map((c) => (
              <CommentItem key={c._id} postId={postId} comment={c} threadId={c._id} />
            ))}
          </ul>
        )
      )}
      {status === "CanLoadMore" && (
        <Button variant="ghost" size="sm" onClick={() => loadMore(10)} className="cursor-pointer self-start text-violet-400">
          Show more comments
        </Button>
      )}
    </div>
  );
}
