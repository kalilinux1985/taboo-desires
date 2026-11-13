"use client";

import { useState } from "react";
import Link from "next/link";
import { Forward, MessageCircle, MoreHorizontal, ThumbsUp, Trash2 } from "lucide-react";
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

const ACTION = "flex cursor-pointer items-center gap-1.5 transition-colors hover:text-[#f9f9f9]";

/**
 * A post in the profile's Latest Activity, laid out like the design: square
 * avatar, seller level, "Name • 2hr", the text and photo, Like, Comments and Share,
 * then the comment box and comments.
 */
export default function ProfilePostCard({ item }: { item: FeedItem }) {
  const toggleLike = useMutation(api.posts.toggleLike);
  const remove = useMutation(api.posts.remove);
  const [showComments, setShowComments] = useState(item.commentCount > 0);
  const now = useNow(30_000);
  const verb = activityVerb(item);
  const profile = `/seller/${item.author._id}`;
  const label = roleLabel(item.author);
  const text =
    item.body || (item.kind !== "status" ? `${verb.lead} ${verb.link}${item.listing ? `: ${item.listing.title}` : ""}` : "");

  const like = () =>
    toggleLike({ postId: item._id }).catch((e) => toast.error(getErrorMessage(e, "Sign in to like posts")));
  const share = async () => {
    const url = `${window.location.origin}${item.listing ? `/listing/${item.listing._id}` : profile}`;
    try {
      if (navigator.share) await navigator.share({ url, title: item.author.name });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      // Share sheet dismissed
    }
  };
  const del = () =>
    remove({ postId: item._id })
      .then(() => toast.success("Post deleted"))
      .catch((e) => toast.error(getErrorMessage(e, "Could not delete")));

  return (
    <article className="flex flex-col rounded-[1px] border border-white/25 bg-[#030917]/50 px-[14px] py-[15px] shadow-[0_14px_28px_-8px_rgba(0,0,0,0.3)]">
      <header className="flex items-center gap-2.5">
        <Link href={profile} className="shrink-0 cursor-pointer">
          <ProfileAvatar
            name={item.author.name}
            url={item.author.avatarUrl}
            className="size-[37px] rounded-[1px] bg-[#a8a9ae] text-base text-[#2a2a2e]"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          {label && (
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#7f22fe]">{label}</span>
          )}
          <p className="flex min-w-0 items-baseline gap-2 text-[#66656a]">
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
              <Button variant="ghost" size="icon" aria-label="Post options" className="size-7 shrink-0 cursor-pointer text-[#66656a]">
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
      </header>

      {text && (
        <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-[1.55] text-[#a1a2a4]">{text}</p>
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
        <p className="mt-3 text-sm text-[#66656a]">This listing is no longer available.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#9fa0a2]">
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          aria-expanded={showComments}
          aria-label={showComments ? "Hide comments" : "Show comments"}
          title="Comments"
          className={cn(ACTION, showComments && "text-[#f9f9f9]")}
        >
          <MessageCircle className="size-4 text-violet-600" />
        </button>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={like}
            aria-pressed={item.likedByMe}
            aria-label={item.likedByMe ? "Unlike" : "Like"}
            title={item.likedByMe ? "Unlike" : "Like"}
            className={cn(ACTION, item.likedByMe && "text-[#f9f9f9]")}
          >
            <ThumbsUp className="size-4 text-violet-600" />
            <span>{item.likeCount}</span>
          </button>
          <LikerAvatars likers={item.likers} total={item.likeCount} postId={item._id} size="sm" />
        </div>
        <button type="button" onClick={share} className={cn(ACTION, "ml-auto")}>
          <Forward className="size-3.5 text-violet-600" />
          Share
        </button>
      </div>

      <PostComments postId={item._id} showList={showComments} variant="profile" className="mt-4" />
    </article>
  );
}
