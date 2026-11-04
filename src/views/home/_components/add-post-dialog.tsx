import { useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import PhotoUploader, { type Photo } from "@/components/photo-uploader.tsx";
import { getErrorMessage } from "@/lib/listings.ts";

const MAX_PHOTOS = 4;
const BODY_MAX = 1000;

/** "Add Post" composer: text and/or up to 4 photos. */
export default function AddPostDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useMutation(api.posts.create);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);

  const canPost = body.trim().length > 0 || photos.length > 0;

  const submit = async () => {
    setSaving(true);
    try {
      await create({ body, imageIds: photos.map((p) => p.id) });
      toast.success("Posted to the activity feed");
      setBody("");
      setPhotos([]);
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not post"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">What&apos;s happening?</DialogTitle>
          <DialogDescription>Share an update or photos with the community.</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          maxLength={BODY_MAX}
          placeholder="Happy Halloween! I'll do the tricks, you send the treats..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <PhotoUploader photos={photos} onChange={setPhotos} maxPhotos={MAX_PHOTOS} showCover={false} />
        <p className="text-xs text-muted-foreground">No nudity in public posts. Posts that break this rule will be removed.</p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canPost || saving} className="cursor-pointer">
            {saving && <Spinner />} Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
