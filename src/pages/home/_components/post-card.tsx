import { useState } from "react";
import { Link } from "react-router-dom";
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
import { useNow } from "@/hooks/use-now.ts";
import { cn } from "@/lib/utils.ts";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { activityVerb, shortAge, type FeedItem } from "../_lib/feed.ts";
import PostComments from "./post-comments.tsx";

function PostImages({ images }: { images: string[] }) {
  if (images.length === 1) {
    return (
      <div className="w-full max-w-sm overflow-hidden rounded-lg border border-white/10 bg-muted">
        <img src={images[0]} alt="" loading="lazy" className="max-h-[28rem] w-full object-cover" />
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
      to={`/listing/${listing._id}`}
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

/** One activity entry: avatar, name, "Added a new photo > caption", media, counts and age. */
export default function PostCard({ item, online }: { item: FeedItem; online: boolean }) {
  const toggleLike = useMutation(api.posts.toggleLike);
  const remove = useMutation(api.posts.remove);
  const [showComments, setShowComments] = useState(false);
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
    <article className="flex gap-3 border-b border-white/10 py-6 sm:gap-4">
      <Link to={profile} className="relative h-fit shrink-0 cursor-pointer">
        <ProfileAvatar
          name={item.author.name}
          url={item.author.avatarUrl}
          className="size-14 text-2xl ring-2 ring-violet-700/60 sm:size-20 sm:text-3xl"
        />
        {online && (
          <span
            aria-label="Online"
            className="absolute bottom-1 right-1 size-3.5 rounded-full border-2 border-background bg-emerald-500"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Link to={profile} className="cursor-pointer text-lg font-bold hover:underline">
                {item.author.name}
              </Link>
              {item.author.verified && <VerifiedBadge />}
              {item.author.country && (
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.author.country}
                </span>
              )}
            </p>
            <p className="break-words text-foreground/80">
              {verb.lead}{" "}
              <Link to={verbHref} className="cursor-pointer font-bold text-violet-400 hover:underline">
                {verb.link}
              </Link>
              {(item.body || item.listing) && <ChevronRight className="mx-1 inline size-4 text-muted-foreground" />}
              {item.listing && !item.body ? (
                <span className="font-bold text-foreground">{item.listing.title}</span>
              ) : (
                <span className="whitespace-pre-wrap">{item.body}</span>
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

        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <div className="flex items-center divide-x divide-white/10">
            <button
              type="button"
              onClick={() => setShowComments((s) => !s)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 pr-4 transition-colors hover:text-foreground",
                showComments && "text-violet-400",
              )}
            >
              {item.commentCount} <MessageCircle className="size-5" />
            </button>
            <button
              type="button"
              onClick={like}
              aria-pressed={item.likedByMe}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 pl-4 transition-colors hover:text-foreground",
                item.likedByMe && "text-violet-400",
              )}
            >
              <Heart className={cn("size-5", item.likedByMe && "fill-violet-500 text-violet-500")} /> {item.likeCount}
            </button>
          </div>
          <span className="flex items-center gap-1 text-sm">
            <Clock className="size-4" /> {shortAge(item._creationTime, now)}
          </span>
        </div>

        {showComments && <PostComments postId={item._id} />}
      </div>
    </article>
  );
}
