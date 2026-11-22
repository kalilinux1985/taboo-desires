import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { Film, ImagePlus, Images, Video, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { uploadFile } from "@/lib/backend/upload.ts";
import type { Id } from "@/lib/backend/types.ts";
import { LOCKED_MEDIA_MAX } from "@/shared/plans.ts";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";

export type LockedItem = {
  storageId: Id<"_storage">;
  kind: "image" | "video";
  /** Original file URL, only ever shown to the seller */
  url: string;
  /** Kept for new uploads so the cover can be made from it */
  file?: File;
  /** Video length in seconds */
  durationSec?: number;
};

/** Reads a video file's length in seconds (0 when the browser can't tell). */
function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    const url = URL.createObjectURL(file);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(el.duration) ? Math.round(el.duration) : 0);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    el.src = url;
  });
}

/** The public, unblurred picture shown on the listing: the first photo, or the video's thumbnail. */
export type LockedCover = {
  id: Id<"_storage">;
  url: string;
  /** The photo this cover was made from (photo listings only) */
  forItem?: Id<"_storage">;
};

export type LockedValue = { items: LockedItem[]; cover: LockedCover | null };

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

type Mode = "photos" | "video";

const TILE = "relative aspect-square overflow-hidden rounded-[5px] bg-muted";
const ADD =
  "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[5px] border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-foreground";

/**
 * Instant Content uploader: either up to 10 photos (the first is the public cover)
 * or one video plus one thumbnail photo. Covers are public and not blurred.
 */
export default function LockedMediaUploader({
  value,
  onChange,
}: {
  value: LockedValue;
  onChange: (value: LockedValue) => void;
}) {
  const { items, cover } = value;
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [mode, setMode] = useState<Mode>(items.some((i) => i.kind === "video") ? "video" : "photos");

  const put = (body: Blob, visibility: "public" | "private") => uploadFile(generateUploadUrl, body, visibility);

  const checkImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(`${file.name} isn't a photo`);
      return false;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`${file.name} is over 10MB`);
      return false;
    }
    return true;
  };

  /** Photo listings: the cover is a public copy of the first photo. */
  const withCover = async (next: LockedItem[], current: LockedCover | null): Promise<LockedValue> => {
    const first = next[0];
    if (!first) return { items: next, cover: null };
    if (current && (current.forItem === undefined || current.forItem === first.storageId))
      return { items: next, cover: { ...current, forItem: first.storageId } };
    const blob = first.file ?? (await (await fetch(first.url)).blob());
    const id = await put(blob, "public");
    return { items: next, cover: { id, url: URL.createObjectURL(blob), forItem: first.storageId } };
  };

  // Older photo listings have no public cover yet: make one from the first photo
  const needsCover = mode === "photos" && items.length > 0 && !cover;
  useEffect(() => {
    if (!needsCover) return;
    withCover(items, null).then(onChange, () => toast.error("Could not make a cover photo. Remove and re-add the first photo."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsCover]);

  const run = async (n: number, work: () => Promise<void>) => {
    setUploading(n);
    try {
      await work();
    } catch {
      toast.error("Some files failed to upload. Please try again.");
    } finally {
      setUploading(0);
    }
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    onChange({ items: [], cover: null });
  };

  const addPhotos = async (files: FileList | null) => {
    if (photoInput.current) photoInput.current.value = "";
    if (!files) return;
    const room = Math.max(0, LOCKED_MEDIA_MAX - items.length);
    if (files.length > room) toast.error(`You can add up to ${LOCKED_MEDIA_MAX} photos`);
    const selected = Array.from(files).slice(0, room).filter(checkImage);
    await run(selected.length, async () => {
      const added = await Promise.all(
        selected.map(async (file): Promise<LockedItem> => ({
          storageId: await put(file, "private"),
          kind: "image",
          url: URL.createObjectURL(file),
          file,
        })),
      );
      onChange(await withCover([...items, ...added], cover));
    });
  };

  const removePhoto = async (id: Id<"_storage">) => {
    try {
      onChange(await withCover(items.filter((x) => x.storageId !== id), cover));
    } catch {
      toast.error("Could not update the cover photo. Please try again.");
    }
  };

  const addVideo = async (files: FileList | null) => {
    if (videoInput.current) videoInput.current.value = "";
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) return void toast.error(`${file.name} isn't a video`);
    if (file.size > MAX_VIDEO_BYTES) return void toast.error(`${file.name} is over 200MB`);
    await run(1, async () => {
      const [storageId, durationSec] = await Promise.all([put(file, "private"), videoDuration(file)]);
      onChange({ items: [{ storageId, kind: "video", url: URL.createObjectURL(file), file, durationSec }], cover });
    });
  };

  const addThumbnail = async (files: FileList | null) => {
    if (thumbInput.current) thumbInput.current.value = "";
    const file = files?.[0];
    if (!file || !checkImage(file)) return;
    await run(1, async () => {
      const id = await put(file, "public");
      onChange({ items, cover: { id, url: URL.createObjectURL(file) } });
    });
  };

  const modeButton = (m: Mode, label: string, icon: React.ReactNode) => (
    <Button variant="plain" size="none"
      key={m}
      type="button"
      onClick={() => switchMode(m)}
      aria-pressed={mode === m}
      className={cn(
        "flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[5px] border text-sm transition-colors",
        mode === m ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:border-primary",
      )}
    >
      {icon} {label}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {modeButton("photos", `Photos (up to ${LOCKED_MEDIA_MAX})`, <Images className="size-4" />)}
        {modeButton("video", "One video", <Video className="size-4" />)}
      </div>

      {mode === "photos" ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((item, i) => (
            <div key={item.storageId} className={TILE}>
              <img src={item.url} alt="" className="size-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded-[5px] bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                  Cover
                </span>
              )}
              <Button variant="plain" size="none"
                type="button"
                aria-label="Remove photo"
                onClick={() => removePhoto(item.storageId)}
                className="absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className={cn(TILE, "flex items-center justify-center")}>
              <Spinner />
            </div>
          ))}
          {items.length + uploading < LOCKED_MEDIA_MAX && (
            <Button variant="plain" size="none" type="button" onClick={() => photoInput.current?.click()} className={ADD}>
              <ImagePlus className="size-6" />
              <span className="text-xs font-medium">Add photos</span>
            </Button>
          )}
          <Input
            ref={photoInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addPhotos(e.target.files)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {/* The one video */}
          {items[0] ? (
            <div className={TILE}>
              <video src={items[0].url} muted playsInline className="size-full object-cover" />
              <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded-[5px] bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                <Film className="size-3" /> Video
              </span>
              <Button variant="plain" size="none"
                type="button"
                aria-label="Remove video"
                onClick={() => onChange({ items: [], cover })}
                className="absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : uploading > 0 && !cover ? (
            <div className={cn(TILE, "flex items-center justify-center")}>
              <Spinner />
            </div>
          ) : (
            <Button variant="plain" size="none" type="button" onClick={() => videoInput.current?.click()} className={ADD}>
              <Video className="size-6" />
              <span className="text-xs font-medium">Add video</span>
            </Button>
          )}
          {/* Its thumbnail, shown publicly and not blurred */}
          {cover ? (
            <div className={TILE}>
              <img src={cover.url} alt="" className="size-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded-[5px] bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                Thumbnail
              </span>
              <Button variant="plain" size="none"
                type="button"
                aria-label="Remove thumbnail"
                onClick={() => onChange({ items, cover: null })}
                className="absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button variant="plain" size="none" type="button" onClick={() => thumbInput.current?.click()} className={ADD}>
              <ImagePlus className="size-6" />
              <span className="text-xs font-medium">Add thumbnail photo</span>
            </Button>
          )}
          <Input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={(e) => addVideo(e.target.files)} />
          <Input ref={thumbInput} type="file" accept="image/*" className="hidden" onChange={(e) => addThumbnail(e.target.files)} />
        </div>
      )}
    </div>
  );
}
