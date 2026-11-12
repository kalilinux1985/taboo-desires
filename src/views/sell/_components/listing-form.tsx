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
import { AUCTION_DURATIONS } from "@/shared/bidding.ts";
import { PLAN_LIMITS } from "@/shared/plans.ts";
import { useQuery } from "@/lib/backend/react.tsx";
import Link from "next/link";
import { api } from "@/lib/backend/api.ts";
import PhotoUploader, { type Photo } from "@/components/photo-uploader.tsx";
import SaleTypePicker from "./sale-type-picker.tsx";
import LockedMediaUploader, { type LockedItem } from "./locked-media-uploader.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Crown, Lock } from "lucide-react";
import { LOCKED_MEDIA_MAX } from "@/shared/plans.ts";
import { type Subcategory } from "@/shared/subcategories.ts";
import { SELL_SECTIONS, findSellItem, sellItemFor } from "@/lib/sell-sections.ts";

const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];
const CONDITION_VALUES = CONDITIONS.map((c) => c.value) as [Condition, ...Condition[]];

const schema = z.object({
  title: z.string().trim().min(3, "At least 3 characters").max(80),
  brand: z.string().trim().min(1, "Required").max(40),
  size: z.string().trim().min(1, "Required").max(20),
  category: z.enum(CATEGORY_VALUES, { message: "Pick a category" }),
  // "" while not chosen; optional so older listings can be saved as they are
  subcategory: z.string(),
  condition: z.enum(CONDITION_VALUES, { message: "Pick a condition" }),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a price like 180 or 180.50")
    .refine((v) => Number(v) >= 1 && Number(v) <= 100000, "Between $1 and $100,000"),
  description: z.string().max(2000),
  saleType: z.enum(["fixed", "auction"]),
  durationHours: z.string(),
});

export type ListingFormValues = z.infer<typeof schema>;

export type ListingSubmit = Omit<ListingFormValues, "price" | "durationHours" | "subcategory"> & {
  subcategory?: Subcategory;
  priceCents: number;
  durationHours: number;
  imageIds: Photo["id"][];
  locked?: { storageId: LockedItem["storageId"]; kind: LockedItem["kind"] }[];
};

export default function ListingForm({
  defaultValues,
  defaultPhotos = [],
  defaultLocked,
  submitLabel,
  onSubmit,
  isEdit = false,
  priceLocked = false,
}: {
  defaultValues?: Partial<ListingFormValues>;
  defaultPhotos?: Photo[];
  /** Set when editing a locked listing */
  defaultLocked?: LockedItem[];
  submitLabel: string;
  onSubmit: (values: ListingSubmit) => Promise<void>;
  /** Sale type and auction length can't change after publishing */
  isEdit?: boolean;
  /** Auction already has bids, so the starting price is fixed */
  priceLocked?: boolean;
}) {
  const [photos, setPhotos] = useState<Photo[]>(defaultPhotos);
  const [photoError, setPhotoError] = useState(false);
  const [isLocked, setIsLocked] = useState(!!defaultLocked);
  const [lockedItems, setLockedItems] = useState<LockedItem[]>(defaultLocked ?? []);
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
      ...defaultValues,
    },
  });

  const mine = useQuery(api.subscriptions.mine, {});
  const limits = mine?.limits ?? PLAN_LIMITS.free;
  // A seller who downgraded keeps the photos they already had, but can't add more
  const maxPhotos = Math.max(limits.maxPhotos, isEdit ? defaultPhotos.length : 0);
  const saleType = useWatch({ control: form.control, name: "saleType" });
  const isAuction = saleType === "auction";

  const toggleLocked = (on: boolean) => {
    setIsLocked(on);
    setPhotoError(false);
    // Locked content is sold at a fixed price only
    if (on) form.setValue("saleType", "fixed");
  };

  // Section and item pickers (the shop menu); the item sets category and type
  const [itemKey, setItemKey] = useState(
    () => sellItemFor(defaultValues?.category, defaultValues?.subcategory, !!defaultLocked)?.key ?? "",
  );
  const [sectionKey, setSectionKey] = useState(() => itemKey.split(":")[0] ?? "");
  const sectionItems = SELL_SECTIONS.find((s) => s.key === sectionKey)?.items ?? [];

  const submit = form.handleSubmit(async ({ price, durationHours, subcategory, ...values }) => {
    if ((isLocked ? lockedItems.length : photos.length) === 0) {
      setPhotoError(true);
      return;
    }
    await onSubmit({
      ...values,
      subcategory: (subcategory || undefined) as Subcategory | undefined,
      priceCents: Math.round(Number(price) * 100),
      durationHours: Number(durationHours),
      // Locked listings show only the blurred previews publicly
      imageIds: isLocked ? lockedItems.map((m) => m.previewId) : photos.map((p) => p.id),
      locked: isLocked ? lockedItems.map(({ storageId, kind }) => ({ storageId, kind })) : undefined,
    });
  });

  const lockedAllowed = limits.lockedContent;

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 rounded-md border border-[#1a2238]/45 bg-card shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] p-4">
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Lock className="size-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <label htmlFor="paywall" className="flex items-center gap-2 font-semibold">
                Paywall this listing
                {!lockedAllowed && mine !== undefined && (
                  <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                    <Crown className="size-3" /> Pro
                  </span>
                )}
              </label>
              <p className="text-xs text-muted-foreground">
                Sell photos or videos. Buyers only see blurred previews until they purchase.
                {!lockedAllowed && mine !== undefined && (
                  <>
                    {" "}
                    <Link href="/pricing" className="cursor-pointer font-semibold text-violet-600 hover:underline">
                      Upgrade to Pro
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
          <Switch
            id="paywall"
            checked={isLocked}
            onCheckedChange={toggleLocked}
            disabled={isEdit || (!lockedAllowed && !isLocked)}
            className="cursor-pointer"
          />
        </div>

        {isLocked ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">Locked photos and videos</p>
              <p className="text-xs text-muted-foreground">
                {lockedItems.length}/{LOCKED_MEDIA_MAX}
              </p>
            </div>
            <LockedMediaUploader
              items={lockedItems}
              onChange={(items) => {
                setLockedItems(items);
                setPhotoError(false);
              }}
            />
            <p className="text-xs text-muted-foreground">
              We create a blurred preview of each file automatically. Originals stay hidden until you approve a purchase.
            </p>
            {photoError && <p className="text-sm text-destructive">Add at least one photo or video</p>}
          </div>
        ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium">Photos</p>
            <p className="text-xs text-muted-foreground">
              {photos.length}/{maxPhotos}
              {mine?.plan !== "pro" && (
                <>
                  {" · "}
                  <Link href="/pricing" className="cursor-pointer font-semibold text-violet-600 hover:underline">
                    Pro gets {PLAN_LIMITS.pro.maxPhotos}
                  </Link>
                </>
              )}
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
          {photoError && <p className="text-sm text-destructive">Add at least one photo</p>}
        </div>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Black lace thong, 2-day wear" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder="Victoria's Secret" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size</FormLabel>
                <FormControl>
                  <Input placeholder="M or US 7" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={() => (
              <FormItem className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={sectionKey}
                    onValueChange={(v) => {
                      setSectionKey(v);
                      setItemKey("");
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SELL_SECTIONS.map((sec) => (
                        <SelectItem key={sec.key} value={sec.key}>
                          {sec.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {sectionKey && (
                  <div className="grid gap-2">
                    <FormLabel>Item</FormLabel>
                    <Select
                      value={itemKey}
                      onValueChange={(v) => {
                        const item = findSellItem(v);
                        if (!item) return;
                        setItemKey(v);
                        form.setValue("category", item.category, { shouldValidate: true });
                        form.setValue("subcategory", item.subcategory);
                        // Instant Pics / Vids are sold as locked photos or videos
                        if (item.instant && !isEdit && lockedAllowed && !isLocked) toggleLocked(true);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select what you're selling" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionItems.map((it) => (
                          <SelectItem key={it.key} value={it.key}>
                            {it.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {sectionKey === "mens" && (
                  <p className="text-xs text-muted-foreground">
                    Men&apos;s pages show listings from sellers whose gender in Settings is Male or Trans man.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wear time</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select wear time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="saleType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How do you want to sell?</FormLabel>
              <SaleTypePicker
                value={field.value}
                onChange={field.onChange}
                disabled={isEdit || isLocked}
                auctionLocked={mine !== undefined && !limits.auctions}
              />
            </FormItem>
          )}
        />

        <div className={isAuction ? "grid gap-6 sm:grid-cols-2" : ""}>
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isAuction ? "Starting bid (USD)" : "Price (USD)"}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      inputMode="decimal"
                      placeholder={isAuction ? "100" : "180"}
                      className="pl-7 font-mono"
                      {...field}
                      disabled={priceLocked}
                    />
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {priceLocked
                    ? "Bids are in, so the starting bid is locked."
                    : "You keep 100%. Taboo Desires takes no commission."}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          {isAuction && (
            <FormField
              control={form.control}
              name="durationHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auction length</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AUCTION_DURATIONS.map((d) => (
                        <SelectItem key={d.hours} value={String(d.hours)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {isEdit ? "Length is set once the auction starts." : "Late bids add 2 minutes."}
                  </p>
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  placeholder="Worn through a long day at the gym. Sealed and shipped discreetly."
                  {...field}
                />
              </FormControl>
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
