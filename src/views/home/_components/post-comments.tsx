import { createContext, useContext, useState } from "react";
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

/** "feed": the home feed's look. "profile": the seller profile design (square avatars, navy boxes, text actions). */
type Variant = "feed" | "profile";
const VariantContext = createContext<Variant>("feed");
const useVariant = () => useContext(VariantContext);

/** Small avatar used next to comments, replies and the comment box. */
function SmallAvatar({ name, url }: { name: string; url: string | null }) {
  const profile = useVariant() === "profile";
  return (
    <ProfileAvatar
      name={name}
      url={url}
      className={cn(
        "bg-[#a8a9ae] text-sm text-[#2a2a2e]",
        profile ? "size-[27px] rounded-[1px]" : "size-[31px] rounded-full",
      )}
    />
  );
}

/** Slate box of the design with an inner shadow (no drop shadow). */
const COMMENT_BOX = "comment-surface rounded-[1px] bg-background shadow-[inset_0_2px_12px_rgba(0,0,0,0.45)]";
/** Navy box of the profile design with an inner shadow (the profile page keeps .comment-surface navy). */
const PROFILE_BOX =
  "comment-surface rounded-[1px] border border-white/40 bg-background shadow-[inset_0_2px_12px_rgba(0,0,0,0.45)]";
const boxClass = (v: Variant) => (v === "profile" ? PROFILE_BOX : COMMENT_BOX);

const LINK_ACTION = "flex cursor-pointer items-center gap-1.5 transition-colors hover:text-[#f2f6ff]";

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
  const variant = useVariant();
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
        className={cn(
          boxClass(variant),
          "w-full pl-4 pr-10 text-[#f2f6ff] outline-none focus:ring-1 focus:ring-violet-600/50",
          variant === "profile"
            ? "h-[31px] text-[12px] placeholder:text-[#4b5263]"
            : "h-9 text-[13px] placeholder:text-slate-400",
        )}
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={!body.trim() || sending}
        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-violet-600 disabled:opacity-60"
      >
        {sending ? <Spinner /> : <Send className="size-4" />}
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
  const variant = useVariant();
  const isTop = threadId === comment._id;
  const profile = `/seller/${comment.author._id}`;
  const remove_ = () =>
    remove({ commentId: comment._id }).catch((e) => toast.error(getErrorMessage(e, "Could not delete")));
  const like = () =>
    toggleLike({ commentId: comment._id }).catch((e) => toast.error(getErrorMessage(e, "Sign in to like comments")));
  const replyForm = replying && (
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
  );

  if (variant === "profile") {
    const TEXT_ACTION = "cursor-pointer transition-colors hover:text-[#f9f9f9]";
    return (
      <li className="flex gap-1.5">
        <Link href={profile} className="h-fit shrink-0 cursor-pointer">
          <SmallAvatar name={comment.author.name} url={comment.author.avatarUrl} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className={cn(PROFILE_BOX, "flex min-h-[72px] flex-col gap-1 px-[13px] py-2")}>
            <div className="flex items-start justify-between gap-3">
              <Link href={profile} className="cursor-pointer truncate text-[12px] tracking-[0.03em] text-[#eaeceb] hover:underline">
                {comment.author.name}
              </Link>
              <span className="flex shrink-0 items-center gap-2 text-[10px] text-[#e3e4e6]">
                <span title={new Date(comment._creationTime).toLocaleString()}>{shortAge(comment._creationTime)}</span>
                {comment.canDelete && (
                  <button type="button" aria-label="Delete comment" onClick={remove_} className="cursor-pointer hover:text-rose-400">
                    <Trash2 className="size-3" />
                  </button>
                )}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words text-[12px] leading-5 text-[#f5f7f6]">{comment.body}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pl-0.5 text-[12.5px] text-[#9da1a2]">
            <button
              type="button"
              aria-pressed={comment.likedByMe}
              onClick={like}
              className={cn(TEXT_ACTION, comment.likedByMe && "text-violet-500")}
            >
              {comment.likedByMe ? "Liked" : "Like"}
            </button>
            <Authenticated>
              <button type="button" onClick={() => setReplying((r) => !r)} className={cn(TEXT_ACTION, replying && "text-violet-500")}>
                Reply
              </button>
            </Authenticated>
            {isTop && comment.replyCount > 0 && (
              <button
                type="button"
                onClick={() => setShowReplies((s) => !s)}
                aria-expanded={showReplies}
                className={cn(TEXT_ACTION, showReplies && "text-[#f9f9f9]")}
              >
                {showReplies
                  ? "Hide replies"
                  : `View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
              </button>
            )}
          </div>

          {replyForm}
          {isTop && showReplies && <Replies postId={postId} parentId={comment._id} />}
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-1.5">
      <Link href={profile} className="h-fit shrink-0 cursor-pointer">
        <SmallAvatar name={comment.author.name} url={comment.author.avatarUrl} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className={cn(COMMENT_BOX, "flex min-h-[84px] flex-col gap-1 px-[15px] py-2.5")}>
          <div className="flex items-start justify-between gap-3">
            <Link href={profile} className="cursor-pointer truncate text-[13px] text-[#f6f8ff] hover:underline">
              {comment.author.name}
            </Link>
            <span className="flex shrink-0 items-center gap-2 text-[10px] text-[#cbd1df]">
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
          <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-[#f2f6ff]">{comment.body}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-7 gap-y-1 pl-0.5 text-[13px] text-[#9a9ca5]">
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
            <Heart className={cn("size-3.5", comment.likedByMe ? "text-violet-900" : "text-violet-600")} strokeWidth={comment.likedByMe ? 3 : 2} />
            <span className={cn(comment.likedByMe && "text-violet-900")}>{comment.likeCount}</span>
          </button>
          {isTop && comment.replyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies((s) => !s)}
              aria-expanded={showReplies}
              aria-label={`${showReplies ? "Hide" : "Show"} ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
              title={showReplies ? "Hide replies" : "Show replies"}
              className={cn(LINK_ACTION, showReplies && "text-[#f2f6ff]")}
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
    <ul className="flex flex-col gap-3">
      {results.map((r) => (
        <CommentItem key={r._id} postId={postId} comment={r} threadId={parentId} />
      ))}
      {status === "CanLoadMore" && (
        <button type="button" onClick={() => loadMore(10)} className={cn(LINK_ACTION, "self-start text-[13px] text-[#9a9ca5]")}>
          More replies
        </button>
      )}
    </ul>
  );
}

/** Shown instead of the comment box to sellers without Premium. */
function PremiumNotice() {
  return (
    <p className="rounded-[1px] border border-violet-600/40 bg-violet-600/10 px-4 py-3 text-center text-[13px] text-violet-100">
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
      <ul className="flex flex-col gap-4">
        {results.map((c) => (
          <CommentItem key={c._id} postId={postId} comment={c} threadId={c._id} />
        ))}
      </ul>
      {status === "CanLoadMore" && (
        <button type="button" onClick={() => loadMore(10)} className={cn(LINK_ACTION, "self-start pl-[37px] text-[13px] text-[#9a9ca5]")}>
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
  variant = "feed",
  className,
}: {
  postId: Id<"posts">;
  showList?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const { needsUpgrade } = useUpgradeGate();
  return (
    <VariantContext.Provider value={variant}>
    <div className={cn("flex flex-col gap-5", className)}>
      <div>
        <Authenticated>
          {needsUpgrade("post") ? (
            <PremiumNotice />
          ) : (
            <div className="flex items-center gap-1.5">
              <MyAvatar />
              <CommentForm postId={postId} />
            </div>
          )}
        </Authenticated>
        <Unauthenticated>
          <p className="text-[13px] text-[#61646d]">
            <Link href="/signin" className="cursor-pointer text-violet-600 hover:underline">
              Sign in
            </Link>{" "}
            to comment.
          </p>
        </Unauthenticated>
      </div>
      {showList && <CommentList postId={postId} />}
    </div>
    </VariantContext.Provider>
  );
}
