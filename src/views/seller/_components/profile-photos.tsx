import { useRef, useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { uploadFile } from "@/lib/backend/upload.ts";
import type { Id } from "@/lib/backend/types.ts";
import { PROFILE_PHOTO_MAX } from "@/shared/accounts.ts";
import { Spinner } from "@/components/ui/spinner.tsx";
import { getErrorMessage } from "@/lib/listings.ts";

const MAX_BYTES = 10 * 1024 * 1024;

type ProfilePhoto = { _id: Id<"profilePhotos">; url: string };

/** Up to 5 public profile photos. The owner can add and remove them. */
export default function ProfilePhotos({
  photos,
  isMe,
}: {
  photos: ProfilePhoto[];
  isMe: boolean;
}) {
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl);
  const addPhoto = useMutation(api.users.addProfilePhoto);
  const removePhoto = useMutation(api.users.removeProfilePhoto);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!isMe && photos.length === 0) return null;
  const room = PROFILE_PHOTO_MAX - photos.length;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Please choose an image");
    if (file.size > MAX_BYTES) return toast.error("Images must be under 10MB");
    setUploading(true);
    try {
      const storageId = await uploadFile(generateUploadUrl, file);
      await addPhoto({ storageId });
    } catch (e) {
      toast.error(getErrorMessage(e, "Photo failed to upload"));
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
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">Photos</h2>
        {isMe && (
          <span className="font-mono text-xs text-muted-foreground">
            {photos.length}/{PROFILE_PHOTO_MAX}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {photos.map((p) => (
          <div
            key={p._id}
            className="group relative aspect-square overflow-hidden rounded-md bg-muted"
          >
            <img src={p.url} alt="" className="size-full object-cover" />
            {isMe && (
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => remove(p._id)}
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
            <span className="text-xs font-medium">Add photo</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />
    </section>
  );
}
