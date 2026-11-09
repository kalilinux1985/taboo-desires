import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@/lib/backend/react.tsx";
import { Forward, Lock, MessageCircle, MoreHorizontal, ThumbsUp, Trash2 } from "lucide-react";
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

/** Serif used by the activity cards (falls back to Georgia outside the profile pages). */
export const POST_FONT = "[font-family:var(--font-profile-text),ui-serif,Georgia,serif]";

function PostImages({ images }: { images: string[] }) {
  if (images.length === 1) {
    return (
      <div className="w-full max-w-[210px] overflow-hidden rounded-[2px] bg-[#8b8b90]">
        <img src={images[0]} alt="" loading="lazy" className="max-h-[22rem] w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="grid max-w-[426px] grid-cols-2 gap-1.5">
      {images.map((url) => (
        <div key={url} className="aspect-square overflow-hidden rounded-[2px] bg-[#8b8b90]">
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
      className="group relative block w-full max-w-[210px] cursor-pointer overflow-hidden rounded-[2px] bg-[#8b8b90]"
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

/** Label above the name: "Premium Seller", "Seller" or "Buyer". */
function roleLabel(author: FeedItem["author"]) {
  if (author.accountType === "seller") return author.isPro ? "Premium Seller" : "Seller";
  if (author.accountType === "buyer") return "Buyer";
  return null;
}

/**
 * One activity post in a dark inset box: square avatar with the member's role
 * and name, the text and media, Like / Comments / Share, then the comment box
 * and comments. Used by the home feed and the seller profile.
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

  const action = "flex cursor-pointer items-center gap-1.5 transition-colors hover:text-slate-200";

  return (
    <article
      className={cn(
        POST_FONT,
        "flex flex-col gap-4 rounded-[3px] border border-white/[0.05] bg-[#040a18] p-4 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)]",
      )}
    >
      <header className="flex items-start gap-2">
        <Link href={profile} className="relative shrink-0 cursor-pointer">
          <ProfileAvatar
            name={item.author.name}
            url={item.author.avatarUrl}
            className="size-[42px] rounded-[2px] bg-[#8b8b90] text-xl text-white"
          />
          {online && (
            <span
              aria-label="Online"
              className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#040a18] bg-emerald-500"
            />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          {label && <span className="text-[10px] uppercase leading-4 text-violet-600">{label}</span>}
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 leading-5">
            <Link href={profile} className="cursor-pointer truncate text-base text-slate-400 hover:text-slate-200">
              {item.author.name}
            </Link>
            {item.author.verified && <VerifiedBadge />}
            <span className="text-[11px] text-slate-500" title={new Date(item._creationTime).toLocaleString()}>
              • {shortAge(item._creationTime, now)}
            </span>
          </p>
        </div>
        {item.canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Post options" className="size-7 shrink-0 cursor-pointer text-slate-500">
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

      {item.body ? (
        <p className="whitespace-pre-wrap break-words text-base leading-[1.4] text-slate-400">{item.body}</p>
      ) : (
        item.kind !== "status" && (
          <p className="text-sm text-slate-500">
            {verb.lead} {verb.link}
            {item.listing && <span className="text-slate-400">: {item.listing.title}</span>}
          </p>
        )
      )}

      {item.images.length > 0 && <PostImages images={item.images} />}
      {item.listing && <ListingPreview listing={item.listing} />}
      {item.kind === "listing" && !item.listing && (
        <p className="text-sm text-slate-500">This listing is no longer available.</p>
      )}

      <div className="flex items-center gap-6 text-[13px] text-slate-400">
        <button
          type="button"
          onClick={like}
          aria-pressed={item.likedByMe}
          aria-label={item.likedByMe ? "Unlike post" : "Like post"}
          title={item.likedByMe ? "Unlike" : "Like"}
          className={action}
        >
          <ThumbsUp className={cn("size-4 text-violet-600", item.likedByMe && "fill-violet-600")} />
          {item.likeCount > 0 && item.likeCount}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          aria-expanded={showComments}
          aria-label={showComments ? "Hide comments" : "Show comments"}
          title="Comments"
          className={cn(action, showComments && "text-slate-300")}
        >
          <MessageCircle className={cn("size-4 text-violet-600", showComments && "fill-violet-600")} />
          {item.commentCount > 0 && item.commentCount}
        </button>
        <button type="button" onClick={share} className={cn(action, "ml-auto")}>
          <Forward className="size-3.5 fill-violet-600 text-violet-600" /> Share
        </button>
      </div>

      <PostComments postId={item._id} showList={showComments} />
    </article>
  );
}
