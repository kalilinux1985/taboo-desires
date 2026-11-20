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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import LikerAvatars from "@/views/home/_components/liker-avatars.tsx";
import { shortAge } from "@/views/home/_lib/feed.ts";
import AddImageDialog from "./add-image-dialog.tsx";
import { Frame, SANS, SERIF, SectionTitle, imagesLabel } from "../_lib/profile-design.tsx";

type Photo = FunctionReturnType<typeof api.users.photosByUser>["page"][number];

type CommentRow = {
  _id: string;
  _creationTime: number;
  body: string;
  canDelete: boolean;
  author: { _id: Id<"users">; name: string; avatarUrl: string | null };
};

/** Comments on one photo: profile photos have their own, photos on a post use the post's. */
function CommentsPanel({ photo }: { photo: Photo }) {
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
    <div className="flex flex-col gap-3 px-1 pb-1">
        <div className="flex max-h-[320px] flex-col gap-4 overflow-y-auto">
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
    </div>
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
    <div className="group relative flex min-w-0 flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-[5px] shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
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
          <Button variant="plain" size="none" type="button" onClick={() => setCommenting((v) => !v)} aria-label={commenting ? "Hide comments" : "Show comments"} aria-expanded={commenting} className="flex cursor-pointer items-center gap-1 hover:text-[#7b3aec]">
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
      {commenting && <CommentsPanel photo={photo} />}
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
  const [album, setAlbum] = useState<Id<"photoAlbums"> | "all">("all");
  const albums = useQuery(api.albums.byUser, { userId });
  const { results, status, loadMore } = usePaginatedQuery(
    api.users.photosByUser,
    album === "all" ? { userId } : { userId, albumId: album },
    { initialNumItems: 24 },
  );
  const removePhoto = useMutation(api.users.removeProfilePhoto);
  const removeAlbum = useMutation(api.albums.remove);
  const [adding, setAdding] = useState(false);

  const remove = async (photoId: Id<"profilePhotos">) => {
    try {
      await removePhoto({ photoId });
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not remove photo"));
    }
  };
  const current = albums?.find((a) => a._id === album);
  const deleteAlbum = async () => {
    if (album === "all") return;
    try {
      const n = await removeAlbum({ albumId: album });
      setAlbum("all");
      toast.success(`Album deleted${n ? ` with ${n} ${n === 1 ? "photo" : "photos"}` : ""}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not delete album"));
    }
  };
  const room = limit === undefined ? Infinity : limit - (ownCount ?? total);

  return (
    <>
    {/* Same Frame as Overview sections: OUTER #202227 around INNER #141519, with the same inner padding. */}
    <Frame className="border-0" innerClassName="flex flex-col gap-[30px] border-0 px-[22px] py-[28px]">
      <div className="flex items-start justify-between gap-4">
        <SectionTitle title="Photos" count={imagesLabel(total)} />
        {isMe && room > 0 && (
          <Button type="button" variant="outline" onClick={() => setAdding(true)} className="h-[38px] cursor-pointer gap-2 border-2 border-[#7b3aec] text-white hover:bg-[#7b3aec]/20">
            <ImagePlus className="size-4 text-[#7b3aec]" /> Add photo
            {limit !== undefined && (
              <span className="font-mono text-xs text-white">
                {ownCount ?? total}/{limit}
              </span>
            )}
          </Button>
        )}
        {isMe && room <= 0 && limit !== undefined && (
          <span className="font-mono text-xs text-white">
            {ownCount ?? total}/{limit} photos
          </span>
        )}
      </div>

      {albums && albums.length > 0 && (
        <div role="tablist" aria-label="Photo albums" className="flex gap-2 overflow-x-auto pb-1">
          {[{ _id: "all" as const, name: "All", photos: total }, ...albums].map((a) => (
            <Button
              key={a._id}
              type="button"
              role="tab"
              aria-selected={album === a._id}
              variant="ghost"
              onClick={() => setAlbum(a._id)}
              className={cn(
                SERIF,
                "h-9 shrink-0 cursor-pointer gap-2 rounded-[5px] border px-4 text-[14px] text-white",
                album === a._id
                  ? "border-[#7b3aec] bg-[#7b3aec] hover:bg-[#7b3aec]"
                  : "border-white/15 bg-[#141519] hover:bg-[#7b3aec]/20",
              )}
            >
              {a.name}
              <span className={cn("text-xs", album === a._id ? "text-white" : "text-[#7b3aec]")}>{a.photos}</span>
            </Button>
          ))}
          {isMe && current && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(SERIF, "h-9 shrink-0 cursor-pointer gap-2 rounded-[5px] border border-red-500/40 px-3 text-[14px] text-red-500 hover:bg-red-500/10 hover:text-red-500")}
                >
                  <Trash2 className="size-4" /> Delete album
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete the album “{current.name}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This also permanently deletes {current.photos === 0 ? "any photos" : current.photos === 1 ? "the 1 photo" : `all ${current.photos} photos`} in this
                    album, along with their likes and comments. This can’t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAlbum} className="cursor-pointer bg-red-600 text-white hover:bg-red-700">
                    Delete album and photos
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      <p className={cn(SERIF, "text-[15px] text-white")}>
        {status === "LoadingFirstPage" ? "Loading photos…" : `Showing ${results.length} ${results.length === 1 ? "image" : "images"}`}
      </p>

      {status === "LoadingFirstPage" ? (
        <div className="grid gap-[17px] sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className={cn(SERIF, "py-16 text-center text-white")}>{album === "all" ? "No photos yet" : "No photos in this album yet"}</p>
      ) : (
        <div className="grid gap-[17px] sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <PhotoCard key={p._id} photo={p} isMe={isMe} onRemove={remove} />
          ))}
        </div>
      )}

      {status === "CanLoadMore" && (
        <Button variant="outline" onClick={() => loadMore(24)} className={cn(SANS, "h-[48px] cursor-pointer border-2 border-[#5e2faf] uppercase tracking-[0.02em] text-white hover:bg-[#7b3aec]/20")}>
          Load more photos
        </Button>
      )}
      {status === "LoadingMore" && <Spinner className="self-center" />}
    </Frame>
    {isMe && <AddImageDialog open={adding} onOpenChange={setAdding} />}
    </>
  );
}
