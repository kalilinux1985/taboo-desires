import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { ImagePlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { uploadFile } from "@/lib/backend/upload.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { getErrorMessage } from "@/lib/listings.ts";

const MAX_BYTES = 10 * 1024 * 1024;
const NO_ALBUM = "none";

/** "Add new Image" popup: file + preview, description, album (or a new one), Submit, Cancel. */
export default function AddImageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl);
  const addPhoto = useMutation(api.users.addProfilePhoto);
  const createAlbum = useMutation(api.albums.create);
  const albums = useQuery(api.albums.mine, open ? {} : "skip");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [album, setAlbum] = useState(NO_ALBUM);
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Preview of the chosen image
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Start fresh each time it opens
  useEffect(() => {
    if (open) return;
    setFile(null);
    setDescription("");
    setAlbum(NO_ALBUM);
    setNaming(false);
    setNewName("");
  }, [open]);

  const choose = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return void toast.error(`${f.name} is not an image`);
    if (f.size > MAX_BYTES) return void toast.error(`${f.name} is over 10MB`);
    setFile(f);
  };

  const addAlbum = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const id = await createAlbum({ name });
      setAlbum(id);
      setNaming(false);
      setNewName("");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not create the album"));
    } finally {
      setCreating(false);
    }
  };

  const submit = async () => {
    if (!file) return void toast.error("Choose an image first");
    setSubmitting(true);
    try {
      const storageId = await uploadFile(generateUploadUrl, file);
      await addPhoto({
        storageId,
        description: description.trim() || undefined,
        albumId: album === NO_ALBUM ? undefined : (album as Id<"photoAlbums">),
      });
      toast.success("Image added");
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e, "The image failed to upload"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add new Image</DialogTitle>
          <DialogDescription className="sr-only">Upload an image to your profile.</DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files[0]);
          }}
          aria-label="Choose an image"
          className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[5px] border-2 border-dashed transition-colors hover:border-primary"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="size-full object-contain" />
          ) : (
            <>
              <ImagePlus className="size-8" />
              <span className="text-sm font-medium">Click or drop an image to upload</span>
              <span className="text-xs">Up to 10MB</span>
            </>
          )}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Description"
          className="resize-none"
        />

        <div className="flex items-center gap-2">
          <Select value={album} onValueChange={setAlbum}>
            <SelectTrigger className="min-w-0 flex-1 cursor-pointer" aria-label="Album">
              <SelectValue placeholder="Select an album" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ALBUM}>No album</SelectItem>
              {albums?.map((a) => (
                <SelectItem key={a._id} value={a._id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={() => setNaming((n) => !n)} className="shrink-0 cursor-pointer">
            <Plus /> Add Album
          </Button>
        </div>
        {naming && (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addAlbum();
                }
              }}
              maxLength={40}
              placeholder="Album name"
            />
            <Button type="button" onClick={() => void addAlbum()} disabled={!newName.trim() || creating} className="shrink-0 cursor-pointer">
              {creating ? <Spinner /> : "Create"}
            </Button>
          </div>
        )}

        <Button type="button" onClick={() => void submit()} disabled={!file || submitting} className="w-full cursor-pointer">
          {submitting ? <Spinner /> : "Submit"}
        </Button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
          className="cursor-pointer self-center text-sm hover:underline"
        >
          Cancel
        </button>
      </DialogContent>
    </Dialog>
  );
}
