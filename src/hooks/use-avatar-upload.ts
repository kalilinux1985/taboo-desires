import { useRef, useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { uploadFile } from "@/lib/backend/upload.ts";
import type { Id } from "@/lib/backend/types.ts";
import { getErrorMessage } from "@/lib/listings.ts";

const MAX_BYTES = 5 * 1024 * 1024;

/** undefined = unchanged, null = removed, id = newly uploaded */
export type AvatarChange = Id<"_storage"> | null | undefined;

export type AvatarPickerProps = {
  name: string;
  currentUrl: string | null;
  onChange: (change: AvatarChange) => void;
  onUploadingChange: (uploading: boolean) => void;
};

/**
 * Uploads the chosen file right away so Save only has to attach the id.
 * The picture only goes live when the profile is saved.
 */
export function useAvatarUpload({
  currentUrl,
  onChange,
  onUploadingChange,
}: AvatarPickerProps) {
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);

  const setBusy = (busy: boolean) => {
    setUploading(busy);
    onUploadingChange(busy);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Please choose an image");
    if (file.size > MAX_BYTES)
      return toast.error("Profile pictures must be under 5MB");
    setBusy(true);
    try {
      const storageId = await uploadFile(generateUploadUrl, file);
      setPreviewUrl(URL.createObjectURL(file));
      onChange(storageId);
    } catch (e) {
      toast.error(getErrorMessage(e, "Picture failed to upload"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = () => {
    setPreviewUrl(null);
    onChange(null);
  };

  const openPicker = () => inputRef.current?.click();

  return { inputRef, previewUrl, uploading, pick, remove, openPicker };
}
