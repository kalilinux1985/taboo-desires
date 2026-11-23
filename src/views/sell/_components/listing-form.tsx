import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { CATEGORIES, CONDITIONS, type Category, type Condition } from "@/lib/listings.ts";
import { PLAN_LIMITS } from "@/shared/plans.ts";
import { useQuery } from "@/lib/backend/react.tsx";
import Link from "next/link";
import { api } from "@/lib/backend/api.ts";
import PhotoUploader, { type Photo } from "@/components/photo-uploader.tsx";
import LockedMediaUploader, { type LockedCover, type LockedItem } from "./locked-media-uploader.tsx";
import { Lock } from "lucide-react";
import { LOCKED_MEDIA_MAX } from "@/shared/plans.ts";
import { type Subcategory } from "@/shared/subcategories.ts";
import { SELL_SECTIONS, findSellItem, sellItemFor } from "@/lib/sell-sections.ts";

const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];
const CONDITION_VALUES = CONDITIONS.map((c) => c.value) as [Condition, ...Condition[]];

/** The sections a seller picks from on the Sell an item form (Instant Content has its own form). */
const ITEM_SECTIONS = SELL_SECTIONS.filter((s) => ["underwear", "shoes", "clothing", "hosiery", "extras"].includes(s.key)).map((s) =>
  s.key === "extras" ? { ...s, label: "Used Extras" } : s,
);

const schema = z.object({
  title: z.string().trim().min(3, "At least 3 characters").max(80),
  // Kept for older listings; the form no longer asks for them
  brand: z.string(),
  size: z.string(),
  category: z.enum(CATEGORY_VALUES, { message: "Pick a category" }),
  // "" while not chosen; optional so older listings can be saved as they are
  subcategory: z.string(),
  condition: z.enum(CONDITION_VALUES).optional(),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a price like 180 or 180.50")
    .refine((v) => Number(v) >= 1 && Number(v) <= 100000, "Between $1 and $100,000"),
  description: z.string().trim().min(3, "Describe what you're selling").max(2000),
  saleType: z.enum(["fixed", "auction"]),
  durationHours: z.string(),
});

export type ListingFormValues = z.infer<typeof schema>;

export type ListingSubmit = Omit<ListingFormValues, "price" | "durationHours" | "subcategory"> & {
  subcategory?: Subcategory;
  priceCents: number;
  durationHours: number;
  imageIds: Photo["id"][];
  locked?: { storageId: LockedItem["storageId"]; kind: LockedItem["kind"]; durationSec?: number }[];
};

export default function ListingForm({
  defaultValues,
  defaultPhotos = [],
  defaultLocked,
  defaultCover,
  submitLabel,
  onSubmit,
  isEdit = false,
  priceLocked = false,
  instant = false,
}: {
  defaultValues?: Partial<ListingFormValues>;
  defaultPhotos?: Photo[];
  /** Set when editing Instant Content */
  defaultLocked?: LockedItem[];
  /** The public cover picture of Instant Content being edited */
  defaultCover?: LockedCover | null;
  submitLabel: string;
  onSubmit: (values: ListingSubmit) => Promise<void>;
  /** Sale type and auction length can't change after publishing */
  isEdit?: boolean;
  /** Auction already has bids, so the starting price is fixed */
  priceLocked?: boolean;
  /**
   * Instant Content: locked photos (up to 10, the first is the public cover)
   * or one locked video with a public thumbnail, plus title, description and price.
   * Otherwise a regular item: photos, category, sub category, description and price.
   */
  instant?: boolean;
}) {
  const [photos, setPhotos] = useState<Photo[]>(defaultPhotos);
  const [photoError, setPhotoError] = useState(false);
  const [lockedItems, setLockedItems] = useState<LockedItem[]>(defaultLocked ?? []);
  const [lockedCover, setLockedCover] = useState<LockedCover | null>(
    defaultCover ? { ...defaultCover, forItem: defaultLocked?.[0]?.storageId } : null,
  );
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      brand: "",
      size: "",
      price: "",
      description: "",
      saleType: "fixed",
      durationHours: "72",
      subcategory: "",
      ...(instant ? { category: "extras" as Category } : {}),
      ...defaultValues,
    },
  });

  const mine = useQuery(api.subscriptions.mine, {});
  const limits = mine?.limits ?? PLAN_LIMITS.free;
  // A seller who downgraded keeps the photos they already had, but can't add more
  // One photo per item; an older listing with more keeps them but can't add any
  const maxPhotos = Math.max(1, isEdit ? defaultPhotos.length : 0);
  const saleType = useWatch({ control: form.control, name: "saleType" });
  const isAuction = saleType === "auction";

  // Category (menu section) and Sub Category (an item under it); the item sets category and type
  const [itemKey, setItemKey] = useState(
    () => sellItemFor(defaultValues?.category, defaultValues?.subcategory)?.key ?? "",
  );
  const [sectionKey, setSectionKey] = useState(() => {
    const key = itemKey.split(":")[0] ?? "";
    return ITEM_SECTIONS.some((s) => s.key === key) ? key : "";
  });
  const sectionItems = ITEM_SECTIONS.find((s) => s.key === sectionKey)?.items ?? [];

  const submit = form.handleSubmit(async ({ price, durationHours, subcategory, title, ...values }) => {
    if ((instant ? lockedItems.length : photos.length) === 0 || (instant && !lockedCover)) {
      setPhotoError(true);
      return;
    }
    if (title.trim().length < 3) {
      form.setError("title", { message: "At least 3 characters" });
      return;
    }
    if (!instant && !subcategory) {
      form.setError("category", { message: "Pick a category and sub category" });
      return;
    }
    const video = lockedItems.some((m) => m.kind === "video");
    await onSubmit({
      ...values,
      title: title.trim(),
      // Instant Content files under Extras as a photo set or a video clip
      ...(instant ? { category: "extras" as Category } : {}),
      subcategory: (instant ? (video ? "video_clips" : "photo_sets") : subcategory || undefined) as Subcategory | undefined,
      priceCents: Math.round(Number(price) * 100),
      durationHours: Number(durationHours),
      // Instant Content shows one public cover (the first photo, or the video's thumbnail)
      imageIds: instant && lockedCover ? [lockedCover.id] : photos.map((p) => p.id),
      locked: instant
        ? lockedItems.map(({ storageId, kind, durationSec }) => ({ storageId, kind, ...(durationSec ? { durationSec } : {}) }))
        : undefined,
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        {instant ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Lock className="size-3.5 text-violet-500" /> Photos or video
              </p>
              <p className="text-xs text-muted-foreground">
                {lockedItems.some((m) => m.kind === "video") ? "1 video + thumbnail" : `${lockedItems.length}/${LOCKED_MEDIA_MAX} photos`}
              </p>
            </div>
            <LockedMediaUploader
              value={{ items: lockedItems, cover: lockedCover }}
              onChange={({ items, cover }) => {
                setLockedItems(items);
                setLockedCover(cover);
                setPhotoError(false);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Everything is locked. Photos: up to {LOCKED_MEDIA_MAX}, and the first one is the public thumbnail. Video: one
              video plus a thumbnail photo. Everyone sees the thumbnail; the rest stays hidden until a buyer unlocks it.
            </p>
            {photoError && <p className="text-sm text-destructive">Add at least one photo, or a video with a thumbnail photo</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">Photo</p>
              <p className="text-xs text-muted-foreground">
                {photos.length}/{maxPhotos}
              </p>
            </div>
            <PhotoUploader
              photos={photos}
              maxPhotos={maxPhotos}
              onChange={(p) => {
                setPhotos(p);
                setPhotoError(false);
              }}
            />
            {photoError && <p className="text-sm text-destructive">Add a photo</p>}
          </div>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder={instant ? "10 pics in my black lace set" : "Black lace thong, 2-day wear"} maxLength={80} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!instant && (
          <FormField
            control={form.control}
            name="category"
            render={() => (
              <FormItem>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={sectionKey}
                      onValueChange={(v) => {
                        setSectionKey(v);
                        setItemKey("");
                        form.setValue("subcategory", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ITEM_SECTIONS.map((sec) => (
                          <SelectItem key={sec.key} value={sec.key} className="cursor-pointer">
                            {sec.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <FormLabel>Sub Category</FormLabel>
                    <Select
                      value={itemKey}
                      disabled={!sectionKey}
                      onValueChange={(v) => {
                        const item = findSellItem(v);
                        if (!item) return;
                        setItemKey(v);
                        form.setValue("category", item.category, { shouldValidate: true });
                        form.setValue("subcategory", item.subcategory);
                      }}
                    >
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue placeholder={sectionKey ? "Select a sub category" : "Pick a category first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionItems.map((it) => (
                          <SelectItem key={it.key} value={it.key} className="cursor-pointer">
                            {it.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{instant ? "Description" : "Description of the item or service"}</FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  placeholder={
                    instant
                      ? "What's in the set, how many pics, how long the video is…"
                      : "Black lace thong, worn 2 days at the gym. Sealed and shipped discreetly."
                  }
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isAuction ? "Starting bid (USD)" : "Price (USD)"}</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input inputMode="decimal" placeholder="180" className="pl-7 font-mono" {...field} disabled={priceLocked} />
                </div>
              </FormControl>
              <p className="text-xs text-muted-foreground">
                {priceLocked ? "Bids are in, so the starting bid is locked." : "You keep 100%. Taboo Desires takes no commission."}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="cursor-pointer">
          {form.formState.isSubmitting && <Spinner />} {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
