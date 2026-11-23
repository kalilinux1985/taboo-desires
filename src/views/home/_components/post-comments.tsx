import { Input } from "@/components/ui/input.tsx";
import CountryFlag from "@/components/country-flag.tsx";
import { Button } from "@/components/ui/button.tsx";
import { createContext, useContext, useState } from "react";
import ReportButton from "@/components/report-button.tsx";
import { useBackendAuth, usePaginatedQuery, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { Authenticated, Unauthenticated } from "@/lib/backend/react.tsx";
import Link from "next/link";
import { Heart, MessageCircle, MessagesSquare, Reply, Send, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType, Id } from "@/lib/backend/types.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { useUpgradeGate } from "@/hooks/use-upgrade-gate.ts";
import LikerAvatars from "./liker-avatars.tsx";
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
        profile ? "size-[27px] rounded-[5px]" : "size-[31px] rounded-full",
      )}
    />
  );
}

/** Comment box: the grey page color with an inner shadow (colors and shadow come from .comment-surface). */
const COMMENT_BOX = "comment-surface rounded-[5px] bg-background shadow-[inset_0_3px_8px_rgba(0,0,0,0.28),inset_0_0_3px_rgba(0,0,0,0.28)]";
/** Profile comment box: the same, with a thin border. */
const PROFILE_BOX =
  "comment-surface rounded-[5px] border border-white/[3%] bg-background shadow-[inset_0_3px_8px_rgba(0,0,0,0.28),inset_0_0_3px_rgba(0,0,0,0.28)]";
const boxClass = (v: Variant) => (v === "profile" ? PROFILE_BOX : COMMENT_BOX);

const LINK_ACTION = "flex cursor-pointer items-center gap-1.5 transition-colors hover:text-white";

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
      <Input
        value={body}
        maxLength={500}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setBody(e.target.value)}
        className={cn(
          boxClass(variant),
          "w-full pl-4 pr-10 text-white outline-none",
          variant !== "profile" && "border-0",
          variant === "profile"
            ? "h-[31px] text-[12px] placeholder:text-white/70"
            : "h-9 text-[13px] placeholder:text-white/70",
        )}
      />
      <Button variant="plain" size="none"
        type="submit"
        aria-label="Send"
        disabled={!body.trim() || sending}
        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-violet-600 disabled:cursor-default"
      >
        {sending ? <Spinner /> : <Send className="size-4" />}
      </Button>
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
    const TEXT_ACTION = "cursor-pointer transition-colors hover:text-white";
    return (
      <li className="flex gap-1.5">
        <Link href={profile} className="h-fit shrink-0 cursor-pointer">
          <SmallAvatar name={comment.author.name} url={comment.author.avatarUrl} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className={cn(PROFILE_BOX, "flex min-h-[72px] flex-col gap-1 px-[13px] py-2")}>
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5">
                <Link href={profile} className="cursor-pointer truncate text-[12px] tracking-[0.03em] text-white hover:underline">
                  {comment.author.name}
                </Link>
                {comment.author.country && <CountryFlag country={comment.author.country} className="inline-flex h-3 w-[18px] shrink-0 overflow-hidden rounded-[2px]" />}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-[10px] text-white">
                <span title={new Date(comment._creationTime).toLocaleString()}>{shortAge(comment._creationTime)}</span>
                {comment.canDelete ? (
                  <Button variant="plain" size="none" type="button" aria-label="Delete comment" onClick={remove_} className="cursor-pointer hover:text-red-500">
                    <Trash2 className="size-3" />
                  </Button>
                ) : (
                  <ReportButton target={{ kind: "comment", id: comment._id }} iconOnly className="size-4 p-0 [&_svg]:size-3" />
                )}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words text-[12px] leading-5 text-white">{comment.body}</p>
          </div>

          {/* Same as the post's actions: outlined violet icons, reply first, then like with its count and likers */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pl-0.5 text-[12px] text-white">
            <Authenticated>
              <Button variant="plain" size="none"
                type="button"
                onClick={() => setReplying((r) => !r)}
                aria-label={`Reply to ${comment.author.name}`}
                title="Reply"
                className={TEXT_ACTION}
              >
                <MessageCircle className="size-4 text-violet-600" />
              </Button>
            </Authenticated>
            <div className="flex items-center gap-2.5">
              <Button variant="plain" size="none"
                type="button"
                aria-pressed={comment.likedByMe}
                aria-label={comment.likedByMe ? "Unlike comment" : "Like comment"}
                title={comment.likedByMe ? "Unlike" : "Like"}
                onClick={like}
                className={cn(TEXT_ACTION, "flex items-center gap-1.5")}
              >
                <ThumbsUp className="size-4 text-violet-600" />
                <span>{comment.likeCount}</span>
              </Button>
              <LikerAvatars likers={comment.likers} total={comment.likeCount} size="sm" />
            </div>
            {isTop && comment.replyCount > 0 && (
              <Button variant="plain" size="none"
                type="button"
                onClick={() => setShowReplies((s) => !s)}
                aria-expanded={showReplies}
                className={cn(TEXT_ACTION, showReplies && "text-white")}
              >
                {showReplies
                  ? "Hide replies"
                  : `View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
              </Button>
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
            <span className="flex min-w-0 items-center gap-1.5">
              <Link href={profile} className="cursor-pointer truncate text-[13px] text-white hover:underline">
                {comment.author.name}
              </Link>
              {comment.author.country && <CountryFlag country={comment.author.country} className="inline-flex h-3 w-[18px] shrink-0 overflow-hidden rounded-[2px]" />}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-[10px] text-white">
              <span title={new Date(comment._creationTime).toLocaleString()}>{shortAge(comment._creationTime)}</span>
              {comment.canDelete ? (
                <Button variant="plain" size="none"
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => remove({ commentId: comment._id }).catch((e) => toast.error(getErrorMessage(e, "Could not delete")))}
                  className="cursor-pointer hover:text-red-500"
                >
                  <Trash2 className="size-3" />
                </Button>
              ) : (
                <ReportButton target={{ kind: "comment", id: comment._id }} iconOnly className="size-4 p-0 [&_svg]:size-3" />
              )}
            </span>
          </div>
          <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-white">{comment.body}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-7 gap-y-1 pl-0.5 text-[13px] text-white">
          <Authenticated>
            <Button variant="plain" size="none"
              type="button"
              onClick={() => setReplying((r) => !r)}
              aria-label={`Reply to ${comment.author.name}`}
              title="Reply"
              className={cn(LINK_ACTION, replying && "text-violet-600")}
            >
              <Reply className="size-4 text-violet-600" />
            </Button>
          </Authenticated>
          <Button variant="plain" size="none"
            type="button"
            aria-pressed={comment.likedByMe}
            onClick={() =>
              toggleLike({ commentId: comment._id }).catch((e) => toast.error(getErrorMessage(e, "Sign in to like comments")))
            }
            aria-label={comment.likedByMe ? "Unlike comment" : "Like comment"}
            title={comment.likedByMe ? "Unlike" : "Like"}
            className={LINK_ACTION}
          >
            <Heart className={cn("size-3.5", comment.likedByMe ? "text-violet-600" : "text-violet-600")} strokeWidth={comment.likedByMe ? 3 : 2} />
            <span className={cn(comment.likedByMe && "text-violet-600")}>{comment.likeCount}</span>
          </Button>
          {isTop && comment.replyCount > 0 && (
            <Button variant="plain" size="none"
              type="button"
              onClick={() => setShowReplies((s) => !s)}
              aria-expanded={showReplies}
              aria-label={`${showReplies ? "Hide" : "Show"} ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
              title={showReplies ? "Hide replies" : "Show replies"}
              className={cn(LINK_ACTION, showReplies && "text-white")}
            >
              <MessagesSquare className="size-3.5 text-violet-600" />
              {comment.replyCount}
            </Button>
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
        <Button variant="plain" size="none" type="button" onClick={() => loadMore(10)} className={cn(LINK_ACTION, "self-start text-[13px] text-white")}>
          More replies
        </Button>
      )}
    </ul>
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
        <Button variant="plain" size="none" type="button" onClick={() => loadMore(10)} className={cn(LINK_ACTION, "self-start pl-[37px] text-[13px] text-white")}>
          View more comments
        </Button>
      )}
    </>
  );
}

/** Shown once a post's comment icon is opened: the comments, and the box to add one for buyers and Premium sellers (hidden for sellers without Premium). */
export default function PostComments({
  postId,
  variant = "feed",
  className,
}: {
  postId: Id<"posts">;
  variant?: Variant;
  className?: string;
}) {
  const { needsUpgrade } = useUpgradeGate();
  return (
    <VariantContext.Provider value={variant}>
    <div className={cn("flex flex-col gap-5", className)}>
      <Authenticated>
        {!needsUpgrade("post") && (
          <div className="flex items-center gap-1.5">
            <MyAvatar />
            <CommentForm postId={postId} />
          </div>
        )}
      </Authenticated>
      <Unauthenticated>
        <p className="text-[13px] text-white">
          <Link href="/signin" className="cursor-pointer text-violet-600 hover:underline">
            Sign in
          </Link>{" "}
          to comment.
        </p>
      </Unauthenticated>
      <CommentList postId={postId} />
    </div>
    </VariantContext.Provider>
  );
}
