import { useRef, useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { Film, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { uploadFile } from "@/lib/backend/upload.ts";
import type { Id } from "@/lib/backend/types.ts";
import { LOCKED_MEDIA_MAX } from "@/shared/plans.ts";
import { Spinner } from "@/components/ui/spinner.tsx";
import { makeBlurredPreview } from "@/lib/blur-media.ts";

export type LockedItem = {
  storageId: Id<"_storage">;
  kind: "image" | "video";
  /** Original file URL, only ever shown to the seller */
  url: string;
  previewId: Id<"_storage">;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

/** Photo + video uploader for locked listings. Each file gets a blurred public preview. */
export default function LockedMediaUploader({
  items,
  onChange,
}: {
  items: LockedItem[];
  onChange: (items: LockedItem[]) => void;
}) {
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  // Originals go to private storage; their blurred previews are public
  const put = (body: Blob, visibility: "public" | "private") =>
    uploadFile(generateUploadUrl, body, visibility);

  const upload = async (file: File): Promise<LockedItem | null> => {
    const kind = file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("image/")
        ? "image"
        : null;
    if (!kind) {
      toast.error(`${file.name} isn't a photo or video`);
      return null;
    }
    if (file.size > (kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
      toast.error(
        `${file.name} is over ${kind === "video" ? "200MB" : "10MB"}`,
      );
      return null;
    }
    const preview = await makeBlurredPreview(file);
    const [storageId, previewId] = await Promise.all([
      put(file, "private"),
      put(preview, "public"),
    ]);
    return { storageId, previewId, kind, url: URL.createObjectURL(file) };
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = Math.max(0, LOCKED_MEDIA_MAX - items.length);
    const selected = Array.from(files).slice(0, room);
    if (files.length > room)
      toast.error(`Locked listings hold up to ${LOCKED_MEDIA_MAX} files`);
    setUploading(selected.length);
    try {
      const results = await Promise.all(selected.map(upload));
      onChange([
        ...items,
        ...results.filter((r): r is LockedItem => r !== null),
      ]);
    } catch {
      toast.error("Some files failed to upload. Please try again.");
    } finally {
      setUploading(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.storageId}
          className="relative aspect-square overflow-hidden rounded-[1px] bg-muted"
        >
          {item.kind === "video" ? (
            <video
              src={item.url}
              muted
              playsInline
              className="size-full object-cover"
            />
          ) : (
            <img src={item.url} alt="" className="size-full object-cover" />
          )}
          {item.kind === "video" && (
            <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded-[1px] bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              <Film className="size-3" /> Video
            </span>
          )}
          {i === 0 && (
            <span className="absolute bottom-1 left-1 rounded-[1px] bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
              Cover
            </span>
          )}
          <button
            type="button"
            aria-label="Remove file"
            onClick={() =>
              onChange(items.filter((x) => x.storageId !== item.storageId))
            }
            className="absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      {Array.from({ length: uploading }).map((_, i) => (
        <div
          key={`u${i}`}
          className="flex aspect-square items-center justify-center rounded-[1px] bg-muted"
        >
          <Spinner />
        </div>
      ))}
      {items.length + uploading < LOCKED_MEDIA_MAX && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[1px] border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <ImagePlus className="size-6" />
          <span className="text-xs font-medium">Add photos or videos</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
