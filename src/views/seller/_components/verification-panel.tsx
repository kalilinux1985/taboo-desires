import { useRef, useState } from "react";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { BadgeCheck, Camera, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { uploadFile } from "@/lib/backend/upload.ts";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { getErrorMessage } from "@/lib/listings.ts";

const MAX_BYTES = 10 * 1024 * 1024;

/** Owner-only panel on a seller shop for requesting the verified badge. */
export default function VerificationPanel() {
  const state = useQuery(api.verification.mine, {});
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl);
  const submit = useMutation(api.verification.submit);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!state || state.verified) return null;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Please choose a photo");
    if (file.size > MAX_BYTES) return toast.error("Photos must be under 10MB");
    setUploading(true);
    try {
      // Verification photos stay private; only admins get a short-lived link
      const storageId = await uploadFile(generateUploadUrl, file, "private");
      await submit({ photoStorageId: storageId });
      toast.success(
        "Sent for review. We'll add your badge once it's approved.",
      );
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not send your photo"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const pending = state.status === "pending";
  const rejected = state.status === "rejected";

  return (
    <section className="flex flex-col gap-4 rounded-md border border-sky-400/30 bg-sky-400/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sky-400">
          {pending ? <Clock /> : rejected ? <ShieldAlert /> : <BadgeCheck />}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">
            {pending
              ? "Verification in review"
              : rejected
                ? "Verification not approved"
                : "Get the verified badge"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {pending
              ? "An admin is checking your photo. Your badge appears as soon as it's approved."
              : rejected
                ? (state.reason ?? "Please try again with a clearer photo.")
                : "Upload a selfie holding a handwritten note with your shop name and today's date. Only admins see it, and it's deleted after review."}
          </p>
        </div>
      </div>
      {!pending && (
        <Button
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 cursor-pointer"
        >
          {uploading ? <Spinner /> : <Camera />}{" "}
          {rejected ? "Try again" : "Upload photo"}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </section>
  );
}
