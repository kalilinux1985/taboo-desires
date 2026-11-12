import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@/lib/backend/react.tsx";
import { Clock, Heart, Lock, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import VerifiedBadge from "@/components/verified-badge.tsx";
import CountryFlag from "@/components/country-flag.tsx";
import { useNow } from "@/hooks/use-now.ts";
import { cn } from "@/lib/utils.ts";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { activityVerb, shortAge, type FeedItem } from "../_lib/feed.ts";
import PostComments from "./post-comments.tsx";
import LikerAvatars from "./liker-avatars.tsx";

export function PostImages({ images }: { images: string[] }) {
  if (images.length === 1) {
    return (
      <div className="w-full max-w-[210px] overflow-hidden rounded-[1px] bg-[#8b8b90]">
        <img src={images[0]} alt="" loading="lazy" className="max-h-[22rem] w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="grid max-w-[426px] grid-cols-2 gap-1.5">
      {images.map((url) => (
        <div key={url} className="aspect-square overflow-hidden rounded-[1px] bg-[#8b8b90]">
          <img src={url} alt="" loading="lazy" className="size-full object-cover" />
        </div>
      ))}
    </div>
  );
}

export function ListingPreview({ listing }: { listing: NonNullable<FeedItem["listing"]> }) {
  return (
    <Link
      href={`/listing/${listing._id}`}
      className="group relative block w-full max-w-[210px] cursor-pointer overflow-hidden rounded-[1px] bg-[#8b8b90]"
    >
      {listing.imageUrl && (
        <img
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2 pt-8 text-white">
        <span className="flex min-w-0 items-center gap-1 truncate text-xs">
          {listing.isLocked && <Lock className="size-3 shrink-0 text-violet-300" />}
          <span className="truncate">{listing.title}</span>
        </span>
        <span className="shrink-0 text-xs font-bold">
          {listing.status === "active" ? formatPrice(listing.priceCents) : listing.status === "sold" ? "Sold" : "Ended"}
        </span>
      </div>
    </Link>
  );
}

/** Small tag after the name: "Premium Seller", "Seller" or "Buyer". */
export function roleLabel(author: FeedItem["author"]) {
  if (author.accountType === "seller") return author.isPro ? "Premium Seller" : "Seller";
  if (author.accountType === "buyer") return "Buyer";
  return null;
}

/**
 * One activity post: round avatar on the left; name and flag, the text in a
 * rounded-[1px] bubble, media, then comment count | likes with liker faces and the
 * age on the right; comments below. Used by the home feed and the seller profile.
 */
export default function PostCard({ item, online }: { item: FeedItem; online: boolean }) {
  const toggleLike = useMutation(api.posts.toggleLike);
  const remove = useMutation(api.posts.remove);
  const [showComments, setShowComments] = useState(item.commentCount > 0);
  const now = useNow(30_000);
  const verb = activityVerb(item);
  const profile = `/seller/${item.author._id}`;
  const label = roleLabel(item.author);

  const like = () =>
    toggleLike({ postId: item._id }).catch((e) => toast.error(getErrorMessage(e, "Sign in to like posts")));
  const del = () =>
    remove({ postId: item._id })
      .then(() => toast.success("Post deleted"))
      .catch((e) => toast.error(getErrorMessage(e, "Could not delete")));
  const action = "flex cursor-pointer items-center gap-1.5 transition-colors hover:text-[#f2f6ff]";
  const text = item.body || (item.kind !== "status" ? `${verb.lead} ${verb.link}${item.listing ? `: ${item.listing.title}` : ""}` : "");

  return (
    <article className="flex gap-3 rounded-[1px] border border-[#1a2238]/45 bg-[#0a1123] p-4 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] sm:gap-4">
      <Link href={profile} className="relative h-fit shrink-0 cursor-pointer">
        <ProfileAvatar
          name={item.author.name}
          url={item.author.avatarUrl}
          className="size-12 border border-[#1a2238]/45 bg-[#a8a9ae] text-xl text-[#2a2a2e] sm:size-14 sm:text-2xl"
        />
        {online && (
          <span
            aria-label="Online"
            className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-[#0a1123] bg-emerald-600"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <header className="flex items-center gap-2">
          <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link href={profile} className="cursor-pointer truncate text-[15px] font-bold text-[#696b78] hover:underline">
              {item.author.name}
            </Link>
            {item.author.country && (
              <CountryFlag country={item.author.country} className="h-3.5 w-5 rounded-[1px] object-cover" />
            )}
            {item.author.verified && <VerifiedBadge />}
            {label && <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600">{label}</span>}
          </p>
          {item.canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Post options" className="size-7 shrink-0 cursor-pointer text-[#61646d]">
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
          <p className="whitespace-pre-wrap break-words rounded-[1px] bg-[#0f172a] px-3.5 py-2.5 text-[15px] leading-snug text-[#a8abb4] shadow-[inset_0_2px_12px_rgba(0,0,0,0.5)]">
            {text}
          </p>
        )}

        {item.images.length > 0 && <PostImages images={item.images} />}
        {item.listing && <ListingPreview listing={item.listing} />}
        {item.kind === "listing" && !item.listing && (
          <p className="text-sm text-[#61646d]">This listing is no longer available.</p>
        )}

        <div className="mt-1 flex items-center gap-3 text-sm text-[#9a9ca5]">
          <button
            type="button"
            onClick={() => setShowComments((s) => !s)}
            aria-expanded={showComments}
            aria-label={showComments ? "Hide comments" : "Show comments"}
            title="Comments"
            className={cn(action, "border-r border-[#1a2238]/45 pr-3", showComments && "text-[#f2f6ff]")}
          >
            {item.commentCount}
            <MessageCircle className="size-4 text-violet-600" />
          </button>
          <button
            type="button"
            onClick={like}
            aria-pressed={item.likedByMe}
            aria-label={item.likedByMe ? "Unlike post" : "Like post"}
            title={item.likedByMe ? "Unlike" : "Like"}
            className={action}
          >
            <Heart className={cn("size-4", item.likedByMe ? "text-violet-900" : "text-violet-600")} strokeWidth={item.likedByMe ? 3 : 2} />
            <span className={cn(item.likedByMe && "text-violet-900")}>{item.likeCount}</span>
          </button>
          <span className="flex min-w-0 items-center gap-1 text-xs [&>a]:size-5">
            <LikerAvatars likers={item.likers} total={item.likeCount} postId={item._id} size="sm" />
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-3 text-xs text-[#61646d]">
            <span className="flex items-center gap-1" title={new Date(item._creationTime).toLocaleString()}>
              <Clock className="size-3.5" /> {shortAge(item._creationTime, now)}
            </span>
          </div>
        </div>

        <PostComments postId={item._id} showList={showComments} className="mt-1.5" />
      </div>
    </article>
  );
}
