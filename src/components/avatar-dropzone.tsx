import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";
import { useAvatarUpload, type AvatarPickerProps } from "@/hooks/use-avatar-upload.ts";

/** Large dashed drop area with a portrait preview and a corner remove button. */
export default function AvatarDropzone(props: AvatarPickerProps) {
  const { inputRef, previewUrl, uploading, pick, remove, openPicker } = useAvatarUpload(props);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void pick(e.dataTransfer.files[0]);
      }}
      className={cn(
        "flex min-h-64 items-center justify-center rounded-lg border-2 border-dashed border-[#383b3d]/90 bg-background/50 p-4 transition-colors",
        dragging && "border-violet-600 bg-violet-600/10",
      )}
    >
      {previewUrl ? (
        <div className="relative">
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading}
            aria-label="Change profile image"
            className="block cursor-pointer overflow-hidden rounded-lg"
          >
            <img src={previewUrl} alt="Profile" className="h-56 w-44 object-cover sm:h-64 sm:w-52" />
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={uploading}
            aria-label="Remove profile image"
            className="absolute -right-3 -top-3 flex size-8 cursor-pointer items-center justify-center rounded-full bg-destructive text-white shadow-md transition-transform hover:scale-110"
          >
            <X className="size-4" />
          </button>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
              <Spinner />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={uploading}
          className="flex cursor-pointer flex-col items-center gap-2 p-6 text-center text-muted-foreground"
        >
          {uploading ? <Spinner /> : <ImagePlus className="size-10 text-violet-600" />}
          <span className="text-sm font-medium text-foreground">Drop an image here or click to upload</span>
          <span className="text-xs">JPG, PNG or WebP up to 5MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
