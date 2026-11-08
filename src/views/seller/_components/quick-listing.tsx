"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImageIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { uploadFile } from "@/lib/backend/upload.ts";
import type { Id } from "@/lib/backend/types.ts";
import { useAccess } from "@/hooks/use-access.ts";
import { useUpgradeGate } from "@/hooks/use-upgrade-gate.ts";
import { CATEGORIES, getErrorMessage, type Category } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { HEADING_FONT, INSET, TEXT_FONT } from "../_lib/theme.ts";
import { profileFontVars } from "../_lib/fonts.ts";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 4;
const FIELD = "h-9 rounded-sm border-white/[0.06] bg-[#0f172a] text-sm placeholder:text-slate-500";

type Photo = { id: Id<"_storage">; url: string };

/**
 * "Create a listing" form on the seller's own profile: title, description, category,
 * price and photos. Size and wear time default to "One size" and custom wear;
 * the seller can refine them from the listing's Edit page.
 */
function QuickListingForm({ onPosted }: { onPosted: () => void }) {
  const access = useAccess();
  const create = useMutation(api.listings.create);
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const canList = !!access?.can.list;

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    const ok = picked.filter((f) => {
      if (!f.type.startsWith("image/")) toast.error(`${f.name} is not an image`);
      else if (f.size > MAX_BYTES) toast.error(`${f.name} is over 10MB`);
      else return true;
      return false;
    });
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        ok.map(async (f) => ({ id: await uploadFile(generateUploadUrl, f), url: URL.createObjectURL(f) })),
      );
      setPhotos((p) => [...p, ...uploaded]);
    } catch {
      toast.error("A photo failed to upload. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(Number(price) * 100);
    if (title.trim().length < 3) return toast.error("Add a title of at least 3 characters");
    if (!category) return toast.error("Choose a category");
    if (!Number.isFinite(cents) || cents < 100) return toast.error("Enter a price of at least $1");
    if (photos.length === 0) return toast.error("Add at least one photo");
    setPosting(true);
    try {
      await create({
        title: title.trim(),
        description: description.trim(),
        category,
        brand: "Unbranded",
        size: "One size",
        condition: "custom_wear",
        priceCents: cents,
        imageIds: photos.map((p) => p.id),
        saleType: "fixed",
      });
      toast.success("Your listing is live");
      setTitle("");
      setDescription("");
      setCategory("");
      setPrice("");
      setPhotos([]);
      onPosted();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not post the listing"));
    } finally {
      setPosting(false);
    }
  };

  return (
    <form onSubmit={post} className={cn(INSET, "flex flex-col gap-3 p-4")}>
      <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Add a brief title about your listing..." className={FIELD} />
      <Input value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} placeholder="Add description about what it is you're selling..." className={cn(FIELD, "h-11")} />
      <div className="flex flex-wrap gap-3">
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger className={cn(FIELD, "h-9! min-w-0 flex-1 sm:max-w-56")}>
            <SelectValue placeholder="Please choose a category..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={price}
          inputMode="decimal"
          onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="$ Price..."
          className={cn(FIELD, "w-28")}
        />
      </div>
      {photos.length > 0 && (
        <div className="flex gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative size-14 overflow-hidden rounded-sm">
              <img src={p.url} alt="" className="size-full object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => setPhotos((all) => all.filter((x) => x.id !== p.id))}
                className="absolute right-0.5 top-0.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void addPhotos(e.target.files)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || photos.length >= MAX_PHOTOS}
          className="flex cursor-pointer items-center gap-2 rounded-sm bg-[#0f172a] px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {uploading ? <Spinner /> : <ImageIcon className="size-4 text-violet-600" />} Photo
        </button>
        {canList || access === undefined ? (
          <button
            type="submit"
            disabled={posting || !canList}
            className="flex cursor-pointer items-center gap-2 rounded-sm bg-[#0f172a] px-3 py-1.5 text-sm font-semibold hover:bg-violet-600 disabled:opacity-50"
          >
            {posting && <Spinner />} Post Listing
          </button>
        ) : (
          <Link href="/pricing" className="text-sm font-semibold text-violet-600 hover:underline">
            Go Pro to post listings
          </Link>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Need sizes, wear time or an auction?{" "}
        <Link href="/sell" className="text-violet-600 hover:underline">Use the full listing form</Link>
      </p>
    </form>
  );
}

/** "Create Listing" button on the seller's own profile; opens the quick listing form. */
export default function CreateListingButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { blockAndRedirect } = useUpgradeGate();
  // Without Premium the button opens the subscription page instead of the form
  const onOpenChange = (next: boolean) => {
    if (next && blockAndRedirect("list")) return;
    setOpen(next);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            // Phones: fills the right column's height, icon above the words
            "h-auto cursor-pointer flex-col gap-1 whitespace-normal rounded-sm bg-violet-600 px-2 py-2 text-center font-bold leading-tight text-white hover:bg-violet-600 md:h-9 md:flex-row md:whitespace-nowrap md:px-4",
            className,
          )}
        >
          <Plus /> Create Listing
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(profileFontVars, TEXT_FONT, "max-h-[90vh] overflow-y-auto border-white/[0.06] bg-[#0a1123] sm:max-w-lg")}
      >
        <DialogHeader>
          <DialogTitle className={cn(HEADING_FONT, "w-fit border-b-2 border-violet-600 pb-0.5 text-2xl font-normal")}>
            Create a Listing
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add photos, a title and a price. It goes live in your shop right away.
          </DialogDescription>
        </DialogHeader>
        <QuickListingForm onPosted={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
