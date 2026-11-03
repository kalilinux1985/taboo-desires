import { useRef, useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { uploadFile } from "@/lib/backend/upload.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Spinner } from "@/components/ui/spinner.tsx";

export type Photo = { id: Id<"_storage">; url: string };

const MAX_BYTES = 10 * 1024 * 1024;

export default function PhotoUploader({
  photos,
  onChange,
  maxPhotos,
  showCover = true,
}: {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  maxPhotos: number;
  showCover?: boolean;
}) {
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  const upload = async (file: File): Promise<Photo | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error(`${file.name} is not an image`);
      return null;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`${file.name} is over 10MB`);
      return null;
    }
    const storageId = await uploadFile(generateUploadUrl, file);
    return { id: storageId, url: URL.createObjectURL(file) };
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = Math.max(0, maxPhotos - photos.length);
    const selected = Array.from(files).slice(0, room);
    if (files.length > room)
      toast.error(`You can add up to ${maxPhotos} photos`);
    setUploading(selected.length);
    try {
      const results = await Promise.all(selected.map(upload));
      onChange([...photos, ...results.filter((p): p is Photo => p !== null)]);
    } catch {
      toast.error("Some photos failed to upload. Please try again.");
    } finally {
      setUploading(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {photos.map((p, i) => (
        <div
          key={p.id}
          className="group relative aspect-square overflow-hidden rounded-md bg-muted"
        >
          <img src={p.url} alt="" className="size-full object-cover" />
          {showCover && i === 0 && (
            <span className="absolute bottom-1 left-1 rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
              Cover
            </span>
          )}
          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
            className="absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      {Array.from({ length: uploading }).map((_, i) => (
        <div
          key={`u${i}`}
          className="flex aspect-square items-center justify-center rounded-md bg-muted"
        >
          <Spinner />
        </div>
      ))}
      {photos.length + uploading < maxPhotos && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <ImagePlus className="size-6" />
          <span className="text-xs font-medium">Add photos</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
