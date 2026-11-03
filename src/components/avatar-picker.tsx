import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { useAvatarUpload, type AvatarPickerProps } from "@/hooks/use-avatar-upload.ts";

/** Compact round avatar with change/remove buttons (seller settings and shop dialog). */
export default function AvatarPicker(props: AvatarPickerProps) {
  const { inputRef, previewUrl, uploading, pick, remove, openPicker } = useAvatarUpload(props);

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <ProfileAvatar name={props.name || "?"} url={previewUrl} />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
            <Spinner />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={uploading}
          onClick={openPicker}
          className="cursor-pointer"
        >
          <Camera /> {previewUrl ? "Change picture" : "Upload picture"}
        </Button>
        {previewUrl && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={uploading}
            onClick={remove}
            className="cursor-pointer text-muted-foreground"
          >
            <Trash2 /> Remove
          </Button>
        )}
      </div>
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
