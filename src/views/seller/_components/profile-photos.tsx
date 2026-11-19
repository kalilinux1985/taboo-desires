import { useState } from "react";
import ZoomImage from "@/components/zoom-image.tsx";
import { useMutation, usePaginatedQuery } from "@/lib/backend/react.tsx";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import AddImageDialog from "./add-image-dialog.tsx";

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
  const removePhoto = useMutation(api.users.removeProfilePhoto);
  const [adding, setAdding] = useState(false);

  if (!isMe && total === 0) return null;
  const room = limit === undefined ? Infinity : limit - (ownCount ?? total);

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
            className="group relative aspect-square overflow-hidden rounded-[5px] bg-muted"
          >
            <ZoomImage src={p.url} className="size-full"><img src={p.url} alt="" className="size-full object-cover" /></ZoomImage>
            {isMe && p.photoId && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Remove photo"
                onClick={() => remove(p.photoId!)}
                className="absolute right-1 top-1 size-7 cursor-pointer rounded-full bg-black/70 text-white hover:bg-black/80"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
        {isMe && room > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdding(true)}
            className="aspect-square h-auto cursor-pointer flex-col gap-1 border-2 border-dashed hover:border-primary"
          >
            <ImagePlus className="size-6" />
            <span className="text-xs font-medium">{limit === undefined ? "Add photos" : "Add photo"}</span>
          </Button>
        )}
      </div>
      {status === "CanLoadMore" && (
        <Button variant="secondary" onClick={() => loadMore(24)} className="cursor-pointer self-center">
          Load more photos
        </Button>
      )}
      {status === "LoadingMore" && <Spinner className="self-center" />}
      {isMe && <AddImageDialog open={adding} onOpenChange={setAdding} />}
    </section>
  );
}
