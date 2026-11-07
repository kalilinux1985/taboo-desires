import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@/lib/backend/react.tsx";
import { ChevronRight, Clock, Heart, Lock, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
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

function PostImages({ images }: { images: string[] }) {
  if (images.length === 1) {
    return (
      <div className="flex w-full max-w-md justify-center overflow-hidden rounded-md border border-white/15 bg-muted/60">
        <img src={images[0]} alt="" loading="lazy" className="max-h-[32rem] w-auto max-w-full object-contain" />
      </div>
    );
  }
  return (
    <div className="grid max-w-md grid-cols-2 gap-2">
      {images.map((url) => (
        <div key={url} className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-muted">
          <img src={url} alt="" loading="lazy" className="size-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function ListingPreview({ listing }: { listing: NonNullable<FeedItem["listing"]> }) {
  return (
    <Link
      href={`/listing/${listing._id}`}
      className="group relative block w-full max-w-sm cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-muted"
    >
      {listing.imageUrl && (
        <img
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-8 text-white">
        <span className="flex min-w-0 items-center gap-1 truncate text-sm font-semibold">
          {listing.isLocked && <Lock className="size-3.5 shrink-0 text-violet-300" />}
          <span className="truncate">{listing.title}</span>
        </span>
        <span className="shrink-0 font-mono text-sm font-bold">
          {listing.status === "active" ? formatPrice(listing.priceCents) : listing.status === "sold" ? "Sold" : "Ended"}
        </span>
      </div>
    </Link>
  );
}

/** One activity entry laid out like the reference: avatar, name and flag, "Added a new photo > caption",
 * media, comment and like counts with liker faces, age, then the comment thread. */
export default function PostCard({ item, online }: { item: FeedItem; online: boolean }) {
  const toggleLike = useMutation(api.posts.toggleLike);
  const remove = useMutation(api.posts.remove);
  const [showComments, setShowComments] = useState(true);
  const now = useNow(30_000);
  const verb = activityVerb(item);
  const profile = `/seller/${item.author._id}`;
  const verbHref = item.listing ? `/listing/${item.listing._id}` : profile;

  const like = () =>
    toggleLike({ postId: item._id }).catch((e) => toast.error(getErrorMessage(e, "Sign in to like posts")));
  const del = () =>
    remove({ postId: item._id })
      .then(() => toast.success("Post deleted"))
      .catch((e) => toast.error(getErrorMessage(e, "Could not delete")));

  return (
    <article className="flex gap-3 border-b border-white/10 py-6 sm:gap-5">
      <Link href={profile} className="relative h-fit shrink-0 cursor-pointer">
        <ProfileAvatar
          name={item.author.name}
          url={item.author.avatarUrl}
          className="size-16 border-[3px] border-violet-600 text-2xl sm:size-24 sm:text-4xl"
        />
        {online && (
          <span
            aria-label="Online"
            className="absolute bottom-1 right-1 size-3.5 rounded-full border-2 border-background bg-emerald-500"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <Link href={profile} className="cursor-pointer text-xl font-bold hover:underline sm:text-2xl">
                {item.author.name}
              </Link>
              {item.author.country && (
                <CountryFlag country={item.author.country} className="h-4 w-6 rounded-[2px] object-cover sm:h-5 sm:w-7" />
              )}
              {item.author.verified && <VerifiedBadge />}
            </p>
            <p className="break-words text-base text-foreground/80 sm:text-xl">
              {verb.lead}{" "}
              <Link href={verbHref} className="cursor-pointer font-bold text-violet-400 hover:underline">
                {verb.link}
              </Link>
              {(item.body || item.listing) && <ChevronRight className="mx-1.5 inline size-5 text-muted-foreground" />}
              {item.listing && !item.body ? (
                <span className="text-foreground/90">{item.listing.title}</span>
              ) : (
                <span className="whitespace-pre-wrap text-foreground/90">{item.body}</span>
              )}
            </p>
          </div>
          {item.canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Post options" className="size-8 shrink-0 cursor-pointer">
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
        </div>

        {item.images.length > 0 && <PostImages images={item.images} />}
        {item.listing && <ListingPreview listing={item.listing} />}
        {item.kind === "listing" && !item.listing && (
          <p className="text-sm text-muted-foreground">This listing is no longer available.</p>
        )}

        <div className="flex items-start justify-between gap-3 text-lg text-muted-foreground sm:text-xl">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={() => setShowComments((s) => !s)}
              aria-expanded={showComments}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 border-r border-white/15 pr-4 transition-colors hover:text-foreground",
                showComments && "text-violet-400",
              )}
            >
              {item.commentCount} <MessageCircle className="size-6" />
            </button>
            <button
              type="button"
              onClick={like}
              aria-pressed={item.likedByMe}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 pl-1 pr-1 transition-colors hover:text-foreground",
                item.likedByMe && "text-violet-400",
              )}
            >
              <Heart className={cn("size-6", item.likedByMe && "fill-violet-500 text-violet-500")} /> {item.likeCount}
            </button>
            <LikerAvatars likers={item.likers} total={item.likeCount} postId={item._id} />
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            <Clock className="size-5" /> {shortAge(item._creationTime, now)}
          </span>
        </div>

        {showComments && <PostComments postId={item._id} />}
      </div>
    </article>
  );
}
