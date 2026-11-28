"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, ImagePlus, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ZoomImage from "@/components/zoom-image.tsx";
import { useBackendAuth, useMutation, useQuery } from "@/lib/backend/react.tsx";
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
import PostComments from "@/views/home/_components/post-comments.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import Link from "next/link";
import { NURMA, SANS, SERIF } from "../_lib/profile-design.tsx";

type Photo = FunctionReturnType<typeof api.users.photosPage>["items"][number];

type CommentRow = {
  _id: string;
  _creationTime: number;
  body: string;
  canDelete: boolean;
  author: { _id: Id<"users">; name: string; avatarUrl: string | null };
};

/** Same look as the activity feed's comments: comment box with avatar on top, then grey comment bubbles. */
const COMMENT_BOX = "comment-surface rounded-[5px] bg-background shadow-[inset_0_3px_8px_rgba(0,0,0,0.28),inset_0_0_3px_rgba(0,0,0,0.28)]";

/** Comments on one photo, styled like the feed. Photos on a post use the feed's own comments (with replies and likes). */
function CommentsPanel({ photo }: { photo: Photo }) {
  if (photo.postId) return <PostComments postId={photo.postId} className="mt-1.5" />;
  return <OwnPhotoComments photo={photo} />;
}

/** Profile-photo comments (no replies or comment likes on the backend), drawn with the feed's styles. */
function OwnPhotoComments({ photo }: { photo: Photo }) {
  const { isAuthenticated } = useBackendAuth();
  const rows = useQuery(api.photos.comments, photo.photoId ? { photoId: photo.photoId } : "skip") as CommentRow[] | undefined;
  const me = useQuery(api.users.menu, isAuthenticated ? {} : "skip");
  const add = useMutation(api.photos.addComment);
  const removeOwn = useMutation(api.photos.removeComment);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(3);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !photo.photoId) return;
    setBusy(true);
    try {
      await add({ photoId: photo.photoId, body });
      setText("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not comment"));
    } finally {
      setBusy(false);
    }
  };
  const remove = (id: string) =>
    removeOwn({ commentId: id as Id<"photoComments"> }).catch((e) => toast.error(getErrorMessage(e, "Could not delete")));

  return (
    <div className="mt-1.5 flex flex-col gap-5">
      {isAuthenticated ? (
        <div className="flex items-center gap-1.5">
          <ProfileAvatar name={me?.name ?? "?"} url={me?.avatarUrl ?? null} className="size-[31px] rounded-full bg-[#202227] text-sm text-white/40" />
          <form onSubmit={submit} className="relative min-w-0 flex-1">
            <Input
              value={text}
              maxLength={500}
              placeholder="Add a comment..."
              aria-label="Add a comment..."
              onChange={(e) => setText(e.target.value)}
              className={cn(COMMENT_BOX, "h-9 w-full border-0 pl-4 pr-10 text-[13px] text-white outline-none placeholder:text-white/70")}
            />
            <Button
              variant="plain"
              size="none"
              type="submit"
              aria-label="Send"
              disabled={!text.trim() || busy}
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-violet-600 disabled:cursor-default"
            >
              {busy ? <Spinner /> : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      ) : (
        <p className="text-[13px] text-white">
          <Link href="/signin" className="cursor-pointer text-violet-600 hover:underline">
            Sign in
          </Link>{" "}
          to comment.
        </p>
      )}
      {rows === undefined ? (
        <Skeleton className="h-20 w-full" />
      ) : rows.length > 0 ? (
        <>
          <ul className="flex flex-col gap-4">
            {rows.slice(0, shown).map((c) => {
              const profile = `/seller/${c.author._id}`;
              return (
                <li key={c._id} className="flex gap-1.5">
                  <Link href={profile} className="h-fit shrink-0 cursor-pointer">
                    <ProfileAvatar name={c.author.name} url={c.author.avatarUrl} className="size-[31px] rounded-full bg-[#202227] text-sm text-white/40" />
                  </Link>
                  <div className={cn(COMMENT_BOX, "flex min-h-[84px] min-w-0 flex-1 flex-col gap-1 px-[15px] py-2.5")}>
                    <div className="flex items-start justify-between gap-3">
                      <Link href={profile} className="cursor-pointer truncate text-[13px] text-white hover:underline">
                        {c.author.name}
                      </Link>
                      <span className="flex shrink-0 items-center gap-2 text-[10px] text-white">
                        <span title={new Date(c._creationTime).toLocaleString()}>{shortAge(c._creationTime)}</span>
                        {c.canDelete && (
                          <Button variant="plain" size="none" type="button" aria-label="Delete comment" onClick={() => remove(c._id)} className="cursor-pointer hover:text-red-500">
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-white">{c.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {rows.length > shown && (
            <Button
              variant="plain"
              size="none"
              type="button"
              onClick={() => setShown((n) => n + 10)}
              className="flex cursor-pointer items-center gap-1.5 self-start pl-[37px] text-[13px] text-white transition-colors hover:text-white"
            >
              View more comments
            </Button>
          )}
        </>
      ) : null}
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
    // Outer frame around an inner card, as in the design
    <div className="rounded-[3px] border border-[#59595b40] bg-[#202227] p-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
      <div className="group relative flex min-w-0 flex-col overflow-hidden rounded-[3px] border border-[#59595b40] bg-[#141519]">
        <div className="relative aspect-square overflow-hidden bg-[#202227]">
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
              className="absolute right-1.5 top-1.5 size-7 cursor-pointer rounded-full bg-[#0c0f15]/70 text-white hover:bg-[#0c0f15]/80"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
        <div className="flex flex-1 flex-col px-[13px] pb-[13px] pt-[14px]">
          <p className={cn(NURMA, "line-clamp-3 min-h-[44px] break-words text-[17px] leading-[22px] text-white")}>{photo.caption}</p>
          <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-[#59595b40] pt-2.5 text-[13px] text-white">
            <Button
              variant="plain"
              size="none"
              type="button"
              onClick={() => setCommenting((v) => !v)}
              aria-label={commenting ? "Hide comments" : "Show comments"}
              aria-expanded={commenting}
              className="flex cursor-pointer items-center gap-0.5"
            >
              {photo.commentCount} <MessageSquare className="size-[15px] text-[#7c3aed]" strokeWidth={1.75} />
            </Button>
            <Button
              variant="plain"
              size="none"
              type="button"
              onClick={like}
              aria-label={photo.likedByMe ? "Unlike" : "Like"}
              aria-pressed={photo.likedByMe}
              className="flex cursor-pointer items-center gap-0.5"
            >
              {photo.likeCount} <Heart className={cn("size-[15px] text-[#7c3aed]", photo.likedByMe && "fill-current")} strokeWidth={1.75} />
            </Button>
            <span className="flex min-w-0 flex-wrap items-center gap-1 text-xs [&>a]:size-5">
              <LikerAvatars likers={photo.likers} total={photo.likeCount} postId={photo.postId ?? undefined} size="sm" />
            </span>
          </div>
          {commenting && <CommentsPanel photo={photo} />}
        </div>
      </div>
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
  const [page, setPage] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const albums = useQuery(api.albums.byUser, { userId });
  const data = useQuery(api.users.photosPage, album === "all" ? { userId, page } : { userId, albumId: album, page });
  const pick = (a: Id<"photoAlbums"> | "all") => {
    setAlbum(a);
    setPage(0);
  };
  const go = (next: number) => {
    setPage(next);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const shown = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 12;
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
      pick("all");
      toast.success(`Album deleted${n ? ` with ${n} ${n === 1 ? "photo" : "photos"}` : ""}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not delete album"));
    }
  };
  const room = limit === undefined ? Infinity : limit - (ownCount ?? total);

  return (
    <div ref={top} className="flex flex-col gap-[22px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className={cn(SERIF, "flex flex-wrap items-baseline gap-x-3 leading-tight")}>
            <span className="text-[26px] text-white">Photos</span>
            <span className="text-[26px] text-[#7c3aed]">
              {total} {total === 1 ? "Image" : "Images"}
            </span>
          </h2>
          <span className="h-0.5 w-[76px] bg-[#7c3aed]" />
        </div>
        {isMe && room > 0 && (
          <Button type="button" variant="outline" onClick={() => setAdding(true)} className="h-[38px] cursor-pointer gap-2 border-2 border-[#7c3aed] text-white hover:bg-[#7c3aed]/20">
            <ImagePlus className="size-4 text-[#7c3aed]" /> Add photo
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

      <p className={cn(SERIF, "text-[15px] text-white")}>
        {data === undefined ? "Loading photos…" : `Showing ${shown} ${shown === 1 ? "Image" : "Images"}`}
      </p>

      {/* Albums */}
      <div role="tablist" aria-label="Photo albums" className="flex flex-wrap items-center gap-[18px] rounded-[3px] bg-[#141519] px-[10px] py-[16px] pb-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
        {[{ _id: "all" as const, name: "All Photos", photos: total }, ...(albums ?? [])].map((a) => (
          <Button
            key={a._id}
            type="button"
            role="tab"
            aria-selected={album === a._id}
            variant="plain"
            size="none"
            onClick={() => pick(a._id)}
            className={cn(
              SERIF,
              "h-[32px] shrink-0 cursor-pointer rounded-[3px] border-2 bg-transparent px-[10px] text-[15px]",
              album === a._id ? "border-[#7c3aed] text-[#7c3aed]" : "border-[#59595b40] text-white hover:border-[#7c3aed]",
            )}
          >
            {a.name} ({a.photos})
          </Button>
        ))}
        {isMe && current && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="plain"
                size="none"
                className={cn(SERIF, "h-[32px] shrink-0 cursor-pointer gap-2 rounded-[3px] border-2 border-red-500 px-[10px] text-[15px] text-red-500 hover:bg-red-500/10")}
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

      {data === undefined ? (
        <div className="grid gap-[20px] sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[0.83] w-full" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <p className={cn(SERIF, "py-16 text-center text-white")}>{album === "all" ? "No photos yet" : "No photos in this album yet"}</p>
      ) : (
        <div className="grid items-start gap-x-[20px] gap-y-[44px] sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p) => (
            <PhotoCard key={p._id} photo={p} isMe={isMe} onRemove={remove} />
          ))}
        </div>
      )}

      <Pager page={page} hasNext={(page + 1) * pageSize < shown} onGo={go} />
      {isMe && <AddImageDialog open={adding} onOpenChange={setAdding} />}
    </div>
  );
}

/** PREVIOUS / NEXT bar under a paged grid. */
export function Pager({ page, hasNext, onGo }: { page: number; hasNext: boolean; onGo: (page: number) => void }) {
  return (
    <div className="mt-[44px] grid grid-cols-2 overflow-hidden border-2 border-[#7c3aed]">
      <Button
        type="button"
        variant="ghost"
        disabled={page === 0}
        onClick={() => onGo(Math.max(0, page - 1))}
        className={cn(SANS, "h-[86px] cursor-pointer gap-4 rounded-none border-r-2 border-[#7c3aed] text-[30px] uppercase tracking-[0.02em] text-white hover:bg-[#7c3aed]/20 [&_svg]:size-7")}
      >
        <ChevronLeft className="text-[#7c3aed]" /> Previous
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={!hasNext}
        onClick={() => onGo(page + 1)}
        className={cn(SANS, "h-[86px] cursor-pointer gap-4 rounded-none text-[30px] uppercase tracking-[0.02em] text-white hover:bg-[#7c3aed]/20 [&_svg]:size-7")}
      >
        Next <ChevronRight className="text-[#7c3aed]" />
      </Button>
    </div>
  );
}
