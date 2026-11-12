import { useRef, useState } from "react";
import { useMutation, usePaginatedQuery } from "@/lib/backend/react.tsx";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { uploadFile } from "@/lib/backend/upload.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { getErrorMessage } from "@/lib/listings.ts";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * A member's public profile photos, newest first, loaded a page at a time.
 * The owner can add (several at once) and remove them. Sellers have no limit;
 * buyers pass their `limit`.
 */
export default function ProfilePhotos({
  userId,
  isMe,
  total,
  limit,
  ownCount,
}: {
  userId: Id<"users">;
  isMe: boolean;
  /** How many photos the member has in all */
  total: number;
  /** Most profile photos this member may have; leave out for no limit */
  limit?: number;
  /** Profile photos only (the limit counts these, not photos on posts) */
  ownCount?: number;
}) {
  const { results: photos, status, loadMore } = usePaginatedQuery(
    api.users.photosByUser,
    { userId },
    { initialNumItems: 24 },
  );
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl);
  const addPhoto = useMutation(api.users.addProfilePhoto);
  const removePhoto = useMutation(api.users.removeProfilePhoto);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!isMe && total === 0) return null;
  const room = limit === undefined ? Infinity : limit - (ownCount ?? total);

  const upload = async (list: FileList | null) => {
    const files = Array.from(list ?? []).slice(0, room);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} is over 10MB`);
          continue;
        }
        try {
          const storageId = await uploadFile(generateUploadUrl, file);
          await addPhoto({ storageId });
        } catch (e) {
          toast.error(getErrorMessage(e, `${file.name} failed to upload`));
        }
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (photoId: Id<"profilePhotos">) => {
    try {
      await removePhoto({ photoId });
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not remove photo"));
    }
  };

  return (
    <section className="flex flex-col gap-3">
      {isMe && limit !== undefined && (
        <p className="self-end font-mono text-xs text-muted-foreground">
          {ownCount ?? total}/{limit}
        </p>
      )}
      {status === "LoadingFirstPage" && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {photos.map((p) => (
          <div
            key={p._id}
            className="group relative aspect-square overflow-hidden rounded-md bg-muted"
          >
            <img src={p.url} alt="" className="size-full object-cover" />
            {isMe && p.photoId && (
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => remove(p.photoId!)}
                className="absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {isMe && room > 0 && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            {uploading ? <Spinner /> : <ImagePlus className="size-6" />}
            <span className="text-xs font-medium">{limit === undefined ? "Add photos" : "Add photo"}</span>
          </button>
        )}
      </div>
      {status === "CanLoadMore" && (
        <Button variant="secondary" onClick={() => loadMore(24)} className="cursor-pointer self-center">
          Load more photos
        </Button>
      )}
      {status === "LoadingMore" && <Spinner className="self-center" />}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={limit === undefined}
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
    </section>
  );
}
