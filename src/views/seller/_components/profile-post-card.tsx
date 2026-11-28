"use client";

import ReportButton from "@/components/report-button.tsx";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, MoreHorizontal, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { cn } from "@/lib/utils.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { useNow } from "@/hooks/use-now.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { ListingPreview, PostImages, roleLabel } from "@/views/home/_components/post-card.tsx";
import PostComments from "@/views/home/_components/post-comments.tsx";
import LikerAvatars from "@/views/home/_components/liker-avatars.tsx";
import { activityVerb, shortAge, type FeedItem } from "@/views/home/_lib/feed.ts";

const ACTION = "flex cursor-pointer items-center gap-1.5 transition-colors hover:text-white";

/**
 * A post in the profile's Latest Activity, laid out like the design: square
 * avatar, seller level, "Name • 2hr", the text and photo, Comments and Like,
 * then the comment box and comments.
 */
export default function ProfilePostCard({
  item,
  focus,
}: {
  item: FeedItem;
  /** Set when a notification pointed at this post: scroll to it, with its comments open for a comment */
  focus?: { comments: boolean };
}) {
  const toggleLike = useMutation(api.posts.toggleLike);
  const remove = useMutation(api.posts.remove);
  const [showComments, setShowComments] = useState(!!focus?.comments);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus]);
  const now = useNow(30_000);
  const verb = activityVerb(item);
  const profile = `/seller/${item.author._id}`;
  const label = roleLabel(item.author);
  const text =
    item.body || (item.kind !== "status" ? `${verb.lead} ${verb.link}${item.listing ? `: ${item.listing.title}` : ""}` : "");

  const like = () =>
    toggleLike({ postId: item._id }).catch((e) => toast.error(getErrorMessage(e, "Sign in to like posts")));
  const del = () =>
    remove({ postId: item._id })
      .then(() => toast.success("Post deleted"))
      .catch((e) => toast.error(getErrorMessage(e, "Could not delete")));

  return (
    <article ref={ref} id={`post-${item._id}`} className={cn("flex flex-col py-[18px] first:pt-0 last:pb-0", focus && "scroll-mt-24")}>
      <header className="flex items-center gap-2.5">
        <Link href={profile} className="shrink-0 cursor-pointer">
          <ProfileAvatar
            name={item.author.name}
            url={item.author.avatarUrl}
            className="size-[37px] rounded-[5px] bg-[#202227] text-base text-white/40"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          {label && (
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#7c3aed]">{label}</span>
          )}
          <p className="flex min-w-0 items-baseline gap-2 text-white">
            <Link href={profile} className="cursor-pointer truncate text-[15px] tracking-[0.03em] hover:underline">
              {item.author.name}
            </Link>
            <span aria-hidden>•</span>
            <span className="shrink-0 text-[11px]" title={new Date(item._creationTime).toLocaleString()}>
              {shortAge(item._creationTime, now)}
            </span>
          </p>
        </div>
        {item.canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Post options" className="size-7 shrink-0 cursor-pointer text-white">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={del} className="cursor-pointer text-destructive focus:text-destructive">
                <Trash2 /> Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!item.canDelete && (
          <ReportButton target={{ kind: "post", id: item._id }} iconOnly className="size-7 shrink-0 px-0" />
        )}
      </header>

      {text && (
        <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-[1.55] text-white">{text}</p>
      )}
      {item.images.length > 0 && (
        <div className="mt-3 [&>div]:max-w-[185px]">
          <PostImages images={item.images} />
        </div>
      )}
      {item.listing && (
        <div className="mt-3">
          <ListingPreview listing={item.listing} />
        </div>
      )}
      {item.kind === "listing" && !item.listing && (
        <p className="mt-3 text-sm text-white">This listing is no longer available.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white">
        <Button variant="plain" size="none"
          type="button"
          onClick={() => setShowComments((s) => !s)}
          aria-expanded={showComments}
          aria-label={showComments ? "Hide comments" : "Show comments"}
          title="Comments"
          className={cn(ACTION, showComments && "text-white")}
        >
          <MessageCircle className="size-4 text-violet-600" />
          <span>{item.commentCount}</span>
        </Button>
        <div className="flex items-center gap-2.5">
          <Button variant="plain" size="none"
            type="button"
            onClick={like}
            aria-pressed={item.likedByMe}
            aria-label={item.likedByMe ? "Unlike" : "Like"}
            title={item.likedByMe ? "Unlike" : "Like"}
            className={cn(ACTION, item.likedByMe && "text-white")}
          >
            <ThumbsUp className="size-4 text-violet-600" />
            <span>{item.likeCount}</span>
          </Button>
          <LikerAvatars likers={item.likers} total={item.likeCount} postId={item._id} size="sm" />
        </div>
      </div>

      {showComments && <PostComments postId={item._id} variant="profile" className="mt-4" />}
    </article>
  );
}
