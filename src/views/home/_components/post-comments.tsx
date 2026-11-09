import { useState } from "react";
import { useBackendAuth, usePaginatedQuery, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { Authenticated, Unauthenticated } from "@/lib/backend/react.tsx";
import Link from "next/link";
import { Heart, Medal, MessagesSquare, Reply, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType, Id } from "@/lib/backend/types.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { useUpgradeGate } from "@/hooks/use-upgrade-gate.ts";
import { shortAge } from "../_lib/feed.ts";

type Comment = FunctionReturnType<typeof api.posts.listComments>["page"][number];

/** Round avatar used next to comments and the comment box. */
function SmallAvatar({ name, url }: { name: string; url: string | null }) {
  return (
    <ProfileAvatar
      name={name}
      url={url}
      className="size-9 border border-white/10 bg-slate-800 text-base text-slate-200 sm:size-10"
    />
  );
}

const LINK_ACTION = "flex cursor-pointer items-center gap-1.5 transition-colors hover:text-slate-200";

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
    <form onSubmit={submit} className="relative min-w-0 flex-1">
      <input
        value={body}
        maxLength={500}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setBody(e.target.value)}
        className="h-9 w-full rounded-full border border-white/[0.04] bg-slate-900 pl-4 pr-10 text-[13px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.65)] text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-600/50"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={!body.trim() || sending}
        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-violet-600 disabled:opacity-60"
      >
        {sending ? <Spinner /> : <Send className="size-4 fill-violet-600" />}
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
    <li className="flex gap-3 border-t border-white/[0.06] py-3">
      <Link href={profile} className="h-fit shrink-0 cursor-pointer">
        <SmallAvatar name={comment.author.name} url={comment.author.avatarUrl} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[15px] leading-snug text-slate-300">
            <Link href={profile} className="mr-1.5 cursor-pointer font-bold text-slate-100 hover:underline">
              {comment.author.name}
            </Link>
            {comment.body}
          </p>
          <span className="flex shrink-0 items-center gap-2 pt-0.5 text-[11px] text-slate-500">
            <span title={new Date(comment._creationTime).toLocaleString()}>{shortAge(comment._creationTime)}</span>
            {comment.canDelete && (
              <button
                type="button"
                aria-label="Delete comment"
                onClick={() => remove({ commentId: comment._id }).catch((e) => toast.error(getErrorMessage(e, "Could not delete")))}
                className="cursor-pointer hover:text-rose-400"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-400">
          <Authenticated>
            <button
              type="button"
              onClick={() => setReplying((r) => !r)}
              aria-label={`Reply to ${comment.author.name}`}
              title="Reply"
              className={cn(LINK_ACTION, replying && "text-violet-600")}
            >
              <Reply className="size-4 text-violet-600" />
            </button>
          </Authenticated>
          <button
            type="button"
            aria-pressed={comment.likedByMe}
            onClick={() =>
              toggleLike({ commentId: comment._id }).catch((e) => toast.error(getErrorMessage(e, "Sign in to like comments")))
            }
            aria-label={comment.likedByMe ? "Unlike comment" : "Like comment"}
            title={comment.likedByMe ? "Unlike" : "Like"}
            className={LINK_ACTION}
          >
            <Heart className={cn("size-3.5 text-violet-600", comment.likedByMe && "fill-violet-600")} />
            {comment.likeCount}
          </button>
          {isTop && comment.replyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies((s) => !s)}
              aria-expanded={showReplies}
              aria-label={`${showReplies ? "Hide" : "Show"} ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
              title={showReplies ? "Hide replies" : "Show replies"}
              className={cn(LINK_ACTION, showReplies && "text-slate-200")}
            >
              <MessagesSquare className="size-3.5 text-violet-600" />
              {comment.replyCount}
            </button>
          )}
        </div>

        {replying && (
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
        )}
        {isTop && showReplies && <Replies postId={postId} parentId={comment._id} />}
      </div>
    </li>
  );
}

function Replies({ postId, parentId }: { postId: Id<"posts">; parentId: Id<"postComments"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.listComments,
    { postId, parentId },
    { initialNumItems: 10 },
  );
  if (status === "LoadingFirstPage") return <Skeleton className="h-16" />;
  return (
    <ul className="-mb-3 flex flex-col">
      {results.map((r) => (
        <CommentItem key={r._id} postId={postId} comment={r} threadId={parentId} />
      ))}
      {status === "CanLoadMore" && (
        <button type="button" onClick={() => loadMore(10)} className={cn(LINK_ACTION, "self-start text-[13px] text-slate-400")}>
          More replies
        </button>
      )}
    </ul>
  );
}

/** Shown instead of the comment box to sellers without Premium. */
function PremiumNotice() {
  return (
    <p className="rounded-[3px] border border-violet-600/40 bg-violet-600/10 px-4 py-3 text-center text-[13px] text-violet-100">
      Adding comments to the activity feed is a Premium Seller feature.{" "}
      <Link href="/pricing?for=post" className="inline-flex cursor-pointer items-center gap-1 font-bold text-violet-300 hover:underline">
        <Medal className="size-4 text-rose-400" /> Go Premium &gt;
      </Link>
    </p>
  );
}

/** The signed-in member's avatar beside the comment box. */
function MyAvatar() {
  const { isAuthenticated } = useBackendAuth();
  const me = useQuery(api.users.menu, isAuthenticated ? {} : "skip");
  return <SmallAvatar name={me?.name ?? "?"} url={me?.avatarUrl ?? null} />;
}

function CommentList({ postId }: { postId: Id<"posts"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.listComments,
    { postId },
    { initialNumItems: 3 },
  );
  if (status === "LoadingFirstPage") return <Skeleton className="h-20 w-full" />;
  if (results.length === 0) return null;
  return (
    <>
      <ul className="flex flex-col">
        {results.map((c) => (
          <CommentItem key={c._id} postId={postId} comment={c} threadId={c._id} />
        ))}
      </ul>
      {status === "CanLoadMore" && (
        <button type="button" onClick={() => loadMore(10)} className={cn(LINK_ACTION, "self-start border-t border-white/[0.06] pt-3 pl-12 text-[13px] text-slate-400")}>
          View more comments
        </button>
      )}
    </>
  );
}

/** Comment box (or the Premium notice), then the comments when showList is on. */
export default function PostComments({
  postId,
  showList = true,
  className,
}: {
  postId: Id<"posts">;
  showList?: boolean;
  className?: string;
}) {
  const { needsUpgrade } = useUpgradeGate();
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="border-t border-white/[0.06] py-3">
        <Authenticated>
          {needsUpgrade("post") ? (
            <PremiumNotice />
          ) : (
            <div className="flex items-center gap-3">
              <MyAvatar />
              <CommentForm postId={postId} />
            </div>
          )}
        </Authenticated>
        <Unauthenticated>
          <p className="text-[13px] text-slate-500">
            <Link href="/signin" className="cursor-pointer text-violet-600 hover:underline">
              Sign in
            </Link>{" "}
            to comment.
          </p>
        </Unauthenticated>
      </div>
      {showList && <CommentList postId={postId} />}
    </div>
  );
}
