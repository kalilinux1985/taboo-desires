"use client";

import { useState } from "react";
import { Heart, ImagePlus, MessageCircle, Send, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import ZoomImage from "@/components/zoom-image.tsx";
import { useBackendAuth, useMutation, usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType, Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import LikerAvatars from "@/views/home/_components/liker-avatars.tsx";
import { shortAge } from "@/views/home/_lib/feed.ts";
import AddImageDialog from "./add-image-dialog.tsx";
import { CARD, SANS, SERIF } from "../_lib/profile-design.tsx";

type Photo = FunctionReturnType<typeof api.users.photosByUser>["page"][number];

type CommentRow = {
  _id: string;
  _creationTime: number;
  body: string;
  canDelete: boolean;
  author: { _id: Id<"users">; name: string; avatarUrl: string | null };
};

/** Comments on one photo: profile photos have their own, photos on a post use the post's. */
function CommentsDialog({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const { isAuthenticated } = useBackendAuth();
  const own = useQuery(api.photos.comments, photo.photoId ? { photoId: photo.photoId } : "skip");
  const post = usePaginatedQuery(
    api.posts.listComments,
    photo.postId ? { postId: photo.postId } : "skip",
    { initialNumItems: 30 },
  );
  const addOwn = useMutation(api.photos.addComment);
  const addPost = useMutation(api.posts.addComment);
  const removeOwn = useMutation(api.photos.removeComment);
  const removePost = useMutation(api.posts.removeComment);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const rows: CommentRow[] | undefined = photo.photoId ? own : post.status === "LoadingFirstPage" ? undefined : post.results;

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      if (photo.photoId) await addOwn({ photoId: photo.photoId, body });
      else if (photo.postId) await addPost({ postId: photo.postId, body });
      setText("");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not post comment"));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    try {
      if (photo.photoId) await removeOwn({ commentId: id as Id<"photoComments"> });
      else await removePost({ commentId: id as Id<"postComments"> });
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not delete comment"));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={SERIF}>Comments</DialogTitle>
          <DialogDescription className="sr-only">Comments on this photo</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto">
          {rows === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-white">No comments yet.</p>
          ) : (
            rows.map((c) => (
              <div key={c._id} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#a8a9ae]">
                  {c.author.avatarUrl ? (
                    <img src={c.author.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <UserRound className="size-6 text-[#2a2a2e]" strokeWidth={1.5} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2 text-[13px]">
                    <span className="truncate text-[#7b3aec]">{c.author.name}</span>
                    <span className="text-xs text-white">{shortAge(c._creationTime)}</span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] text-white">{c.body}</p>
                </div>
                {c.canDelete && (
                  <Button type="button" variant="ghost" size="icon-xs" aria-label="Delete comment" onClick={() => remove(c._id)} className="cursor-pointer">
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
        {isAuthenticated ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="flex gap-2"
          >
            <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Add a comment" className="h-10" />
            <Button type="submit" size="icon" disabled={busy || !text.trim()} aria-label="Send comment" className="cursor-pointer bg-[#7b3aec] text-white hover:bg-[#8a4ff0]">
              <Send className="size-4" />
            </Button>
          </form>
        ) : (
          <p className="text-sm text-white">Sign in to comment.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** One photo: square picture, caption, then comments, likes and who liked it. */
function PhotoCard({ photo, isMe, onRemove }: { photo: Photo; isMe: boolean; onRemove: (id: Id<"profilePhotos">) => void }) {
  const { isAuthenticated } = useBackendAuth();
  const likeOwn = useMutation(api.photos.toggleLike);
  const likePost = useMutation(api.posts.toggleLike);
  const [commenting, setCommenting] = useState(false);

  const like = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to like photos");
      return;
    }
    try {
      if (photo.photoId) await likeOwn({ photoId: photo.photoId });
      else if (photo.postId) await likePost({ postId: photo.postId });
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not like this photo"));
    }
  };

  return (
    <div className={cn(CARD, "group relative flex min-w-0 flex-col gap-3 bg-[#141519] p-[10px]")}>
      <div className="relative aspect-square overflow-hidden rounded-[5px] border border-white/10 bg-[#8b8b90]">
        <ZoomImage src={photo.url} className="size-full">
          <img src={photo.url} alt={photo.caption} loading="lazy" className="size-full object-cover" />
        </ZoomImage>
        {isMe && photo.photoId && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Remove photo"
            onClick={() => onRemove(photo.photoId!)}
            className="absolute right-1.5 top-1.5 size-7 cursor-pointer rounded-full bg-black/70 text-white hover:bg-black/80"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      {photo.caption && <p className={cn(SERIF, "line-clamp-4 break-words px-1 text-[14px] leading-[20px] text-white")}>{photo.caption}</p>}
      <div className="mt-auto flex flex-col gap-2 border-t border-white/15 px-1 pt-2">
        <div className="flex min-w-0 items-center gap-3 text-[13px] text-white">
          <Button variant="plain" size="none" type="button" onClick={() => setCommenting(true)} aria-label="Comments" className="flex cursor-pointer items-center gap-1 hover:text-[#7b3aec]">
            {photo.commentCount} <MessageCircle className="size-[15px]" strokeWidth={1.5} />
          </Button>
          <span className="h-4 w-px bg-white/20" />
          <Button
            variant="plain"
            size="none"
            type="button"
            onClick={like}
            aria-label={photo.likedByMe ? "Unlike" : "Like"}
            aria-pressed={photo.likedByMe}
            className={cn("flex cursor-pointer items-center gap-1 hover:text-[#7b3aec]", photo.likedByMe && "text-[#7b3aec]")}
          >
            <Heart className={cn("size-[15px]", photo.likedByMe && "fill-current")} strokeWidth={1.5} /> {photo.likeCount}
          </Button>
          <span className="flex min-w-0 flex-wrap items-center gap-1 text-xs [&>a]:size-5">
            <LikerAvatars likers={photo.likers} total={photo.likeCount} postId={photo.postId ?? undefined} size="sm" />
          </span>
        </div>
      </div>
      {commenting && <CommentsDialog photo={photo} onClose={() => setCommenting(false)} />}
    </div>
  );
}

/** The Photos tab body: title, "Showing n images", and a 3-column grid with captions, comments and likes. */
export function PhotosTab({
  userId,
  isMe,
  total,
  limit,
  ownCount,
}: {
  userId: Id<"users">;
  isMe: boolean;
  total: number;
  /** Most profile photos this member may have (buyers); leave out for no limit */
  limit?: number;
  /** Profile photos only (the limit counts these, not photos on posts) */
  ownCount?: number;
}) {
  const { results, status, loadMore } = usePaginatedQuery(api.users.photosByUser, { userId }, { initialNumItems: 24 });
  const removePhoto = useMutation(api.users.removeProfilePhoto);
  const [adding, setAdding] = useState(false);

  const remove = async (photoId: Id<"profilePhotos">) => {
    try {
      await removePhoto({ photoId });
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not remove photo"));
    }
  };
  const label = `${total} ${total === 1 ? "image" : "images"}`;
  const room = limit === undefined ? Infinity : limit - (ownCount ?? total);

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className={cn(SANS, "flex flex-wrap items-baseline gap-x-2.5 leading-tight")}>
            <span className="text-[22px] text-white">Photos</span>
            <span className="text-[20px] tracking-[0.02em] text-[#7b3aec]">{label}</span>
          </h2>
          <span className="h-0.5 w-[60px] bg-[#7b3aec]" />
        </div>
        {isMe && room > 0 && (
          <Button type="button" variant="outline" onClick={() => setAdding(true)} className="h-[38px] cursor-pointer gap-2 border-2 border-[#7b3aec] text-white hover:bg-[#7b3aec]/20">
            <ImagePlus className="size-4 text-[#7b3aec]" /> Add photo
            {limit !== undefined && (
              <span className="font-mono text-xs text-white/70">
                {ownCount ?? total}/{limit}
              </span>
            )}
          </Button>
        )}
        {isMe && room <= 0 && limit !== undefined && (
          <span className="font-mono text-xs text-white/70">
            {ownCount ?? total}/{limit} photos
          </span>
        )}
      </div>

      <p className={cn(SERIF, "text-[15px] text-white")}>
        {status === "LoadingFirstPage" ? "Loading photos…" : `Showing ${results.length} ${results.length === 1 ? "image" : "images"}`}
      </p>

      <div className="rounded-[5px] bg-[#18191d] p-[17px]">
        {status === "LoadingFirstPage" ? (
          <div className="grid gap-[17px] sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className={cn(SERIF, "py-16 text-center text-white")}>No photos yet</p>
        ) : (
          <div className="grid gap-[17px] sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <PhotoCard key={p._id} photo={p} isMe={isMe} onRemove={remove} />
            ))}
          </div>
        )}
      </div>

      {status === "CanLoadMore" && (
        <Button variant="outline" onClick={() => loadMore(24)} className={cn(SANS, "h-[48px] cursor-pointer border-2 border-[#5e2faf] uppercase tracking-[0.02em] text-white hover:bg-[#7b3aec]/20")}>
          Load more photos
        </Button>
      )}
      {status === "LoadingMore" && <Spinner className="self-center" />}
      {isMe && <AddImageDialog open={adding} onOpenChange={setAdding} />}
    </div>
  );
}
