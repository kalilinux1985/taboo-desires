"use client";

import { useState } from "react";
import { MessageCircle, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { shortAge, type FeedItem } from "@/views/home/_lib/feed.ts";
import PostComments from "@/views/home/_components/post-comments.tsx";
import { INSET } from "../_lib/theme.ts";

/** A post in the profile's Latest Activity: header, text, photos, like/comment/share, comments. */
export default function ProfilePost({ item, label }: { item: FeedItem; label: string }) {
  const toggleLike = useMutation(api.posts.toggleLike);
  const [showComments, setShowComments] = useState(true);

  return (
    <article className={cn(INSET, "flex flex-col gap-4 p-4")}>
      <header className="flex items-center gap-3">
        <ProfileAvatar name={item.author.name} url={item.author.avatarUrl} className="size-11 rounded-sm text-xl" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-500">{label}</p>
          <p className="flex items-center gap-2 text-lg text-slate-300">
            <span className="truncate">{item.author.name}</span>
            <span aria-hidden className="text-slate-500">•</span>
            <span className="text-xs text-slate-500">{shortAge(item._creationTime)}</span>
          </p>
        </div>
      </header>

      {item.body && <p className="whitespace-pre-wrap break-words text-lg leading-relaxed text-slate-300">{item.body}</p>}
      {item.listing && !item.body && <p className="text-lg text-slate-300">Listed “{item.listing.title}”</p>}
      {item.images.length > 0 && (
        <div className={cn("grid gap-2", item.images.length > 1 ? "max-w-md grid-cols-2" : "max-w-xs")}>
          {item.images.map((url) => (
            <img key={url} src={url} alt="" loading="lazy" className="aspect-square w-full rounded-sm object-cover" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-6 text-sm text-slate-300">
        <button
          type="button"
          aria-pressed={item.likedByMe}
          onClick={() => toggleLike({ postId: item._id }).catch((e) => toast.error(getErrorMessage(e, "Sign in to like posts")))}
          className="flex cursor-pointer items-center gap-1.5 hover:text-white"
        >
          <ThumbsUp className={cn("size-4 text-violet-500", item.likedByMe && "fill-violet-500")} />
          {item.likedByMe ? "Liked" : "Like"}
          {item.likeCount > 0 && <span className="text-slate-500">({item.likeCount})</span>}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="flex cursor-pointer items-center gap-1.5 hover:text-white"
        >
          <MessageCircle className="size-4 fill-violet-500 text-violet-500" /> Comments
          {item.commentCount > 0 && <span className="text-slate-500">({item.commentCount})</span>}
        </button>
      </div>

      {showComments && <PostComments postId={item._id} className="bg-transparent p-0" />}
    </article>
  );
}
