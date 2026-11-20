"use client";

import ReportButton from "@/components/report-button.tsx";
import { useState } from "react";
import Link from "next/link";
import { useNavigate } from "@/lib/navigation.ts";
import { useParams } from "next/navigation";
import { subcategoryInfo } from "@/shared/subcategories.ts";
import { useMutation, usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, CircleCheck, Lock, MessageSquareText, Pencil, ShoppingBag, Star, Trash2 } from "lucide-react";
import MessageSellerButton from "./_components/message-seller-button.tsx";
import AuctionPanel from "./_components/auction-panel.tsx";
import RelistAuctionButton from "./_components/relist-auction-button.tsx";
import SellDialog from "./_components/sell-dialog.tsx";
import { AccessNotice, BuyLockedPanel, IncludedContent, UnlockBox, UnlockRequests, UnlockedMedia } from "./_components/locked-content.tsx";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Doc, FunctionReturnType, Id } from "@/lib/backend/types.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { CATEGORY_LABEL, CONDITION_LABEL, getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import FavoriteButton from "@/components/favorite-button.tsx";
import UpgradeNotice from "@/components/upgrade-notice.tsx";
import { useAccess } from "@/hooks/use-access.ts";
import { deniedMessage } from "@/shared/accounts.ts";
import ExpandableBio from "@/views/seller/_components/expandable-bio.tsx";
import { ProfileShopCard } from "@/views/seller/_components/profile-sections.tsx";
import { Detail, INNER, NURMA, OUTER, SANS, SERIF, SectionTitle, joinedAgo } from "@/views/seller/_lib/profile-design.tsx";

// The listing page in the profile design: title and picture on the left, the
// seller card on the right (badge, name, rating, description, price, payment
// methods, Message Seller), then "More from <seller>" across the bottom.

/** Full-width violet action (Message Seller / Buy now) */
const WIDE_ACTION = cn(
  SERIF,
  "flex h-[50px] w-full cursor-pointer items-center justify-center rounded-[5px] bg-[#7b3aec] text-[13px] uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#8a4ff0] disabled:cursor-default disabled:opacity-60",
);
/** Outlined violet action (View ALL Items) */
const WIDE_OUTLINED = cn(
  SERIF,
  "inline-flex h-[41px] cursor-pointer items-center justify-center rounded-[5px] border-2 border-[#5e2faf] px-6 text-[13px] tracking-[0.06em] text-[#7b3aec] transition-colors hover:bg-[#7b3aec] hover:text-white",
);
/** "Payment Methods" style sub-heading inside the seller card */
const SUBHEAD = cn(SERIF, "text-[20px] leading-tight text-white");

function Gallery({
  images,
  title,
  locked = false,
}: {
  images: { id: string; url: string }[];
  title: string;
  locked?: boolean;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[8/5] overflow-hidden rounded-[5px] bg-white shadow-[0_6px_14px_rgba(0,0,0,0.35)]">
        {current && <img src={current.url} alt={title} className="size-full object-cover" />}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 text-white">
            <span className="flex size-14 items-center justify-center rounded-full text-[#7b3aec] drop-shadow-md">
              <Lock className="size-6" />
            </span>
            <span className={cn(SERIF, "text-2xl")}>Locked content</span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {images.map((img, i) => (
            <Button variant="plain" size="none"
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "aspect-square cursor-pointer overflow-hidden rounded-[5px] border-2",
                i === active ? "border-[#7b3aec]" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img src={img.url} alt="" className="size-full object-cover" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function OwnerActions({
  listingId,
  status,
  isAuction,
  canDelete,
}: {
  listingId: Id<"listings">;
  status: Doc<"listings">["status"];
  isAuction: boolean;
  canDelete: boolean;
}) {
  const navigate = useNavigate();
  const setStatus = useMutation(api.listings.setStatus);
  const remove = useMutation(api.listings.remove);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
    } catch (e) {
      toast.error(getErrorMessage(e, "Something went wrong"));
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="secondary" className="cursor-pointer">
        <Link href={`/listing/${listingId}/edit`}>
          <Pencil /> Edit
        </Link>
      </Button>
      {!isAuction && status === "active" && <SellDialog listingId={listingId} />}
      {!isAuction && status !== "active" && (
        <Button
          variant="secondary"
          className="cursor-pointer"
          onClick={() => run(() => setStatus({ listingId, status: "active" }), "Listing is live again")}
        >
          <CheckCircle2 /> Relist
        </Button>
      )}
      {isAuction && status === "ended" && <RelistAuctionButton listingId={listingId} />}
      {canDelete && (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="cursor-pointer text-destructive hover:text-destructive">
            <Trash2 /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the listing and its photos for good.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
              onClick={() =>
                run(async () => {
                  await remove({ listingId });
                  navigate("/shop");
                }, "Listing deleted")
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
    </div>
  );
}

type Listing = NonNullable<FunctionReturnType<typeof api.listings.get>>;
type Seller = NonNullable<Listing["seller"]>;

/** The dark card at the top of the seller panel: avatar, tier, name, rating and ID check. */
function SellerCard({ seller }: { seller: Seller }) {
  const { rating, reviewCount } = seller;
  return (
    <Link href={`/seller/${seller._id}`} className={cn(INNER, "group flex cursor-pointer items-center gap-[13px] p-[9px]")}>
      <ProfileAvatar
        name={seller.name}
        url={seller.avatarUrl}
        className="size-[90px] shrink-0 rounded-[5px] bg-white text-3xl text-[#2a2a2e]"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn(SANS, "text-[11px] text-[#7b3aec]")}>{seller.isPro ? "Premium Seller" : "Seller"}</span>
        <span className={cn(NURMA, "mt-0.5 truncate text-[20px] uppercase leading-tight tracking-[0.03em] text-white group-hover:underline")}>
          {seller.name}
        </span>
        <span className={cn(SANS, "mt-1.5 flex flex-wrap items-center gap-x-8 gap-y-1 text-[13px] text-white")}>
          <span className="flex items-center gap-1" title={`${reviewCount} review${reviewCount === 1 ? "" : "s"}`}>
            <Star className="size-[14px] text-[#7b3aec]" strokeWidth={1.75} />
            {(rating ?? 0).toFixed(1)} ({reviewCount})
          </span>
          {seller.verified && (
            <span className="flex items-center gap-1">
              <CircleCheck className="size-[14px] text-[#7b3aec]" strokeWidth={1.75} /> ID Verified
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}

/** "More from <seller>": up to three other items, the count and joined line, and View ALL. */
function MoreFromSeller({ seller, currentId }: { seller: Seller; currentId: Id<"listings"> }) {
  const { results, status } = usePaginatedQuery(
    api.listings.bySeller,
    { sellerId: seller._id, status: "active", kind: "items" },
    { initialNumItems: 4 },
  );
  const others = results.filter((l) => l._id !== currentId).slice(0, 3);
  const profile = `/seller/${seller._id}`;
  return (
    <section className={cn(OUTER, "flex flex-col gap-[22px] px-4 pb-[26px] pt-[22px]")}>
      <SectionTitle title={`More from ${seller.name}`} />
      {status === "LoadingFirstPage" ? (
        <div className="grid gap-[36px] sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[370px]" />
          ))}
        </div>
      ) : others.length === 0 ? (
        <p className={cn(SANS, "text-[13px] text-[#ffffff]")}>No other items for sale right now.</p>
      ) : (
        <div className="grid gap-[36px] sm:grid-cols-2 lg:grid-cols-3">
          {others.map((l) => (
            <ProfileShopCard key={l._id} listing={l} />
          ))}
        </div>
      )}
      <p className={cn(SERIF, "mt-1 text-[17px] text-white")}>
        <Link href={profile} className="cursor-pointer font-bold hover:underline">
          {seller.name}
        </Link>{" "}
        currently has{" "}
        <span className="text-[#7b3aec]">
          {seller.activeListings} {seller.activeListings === 1 ? "item" : "items"} available
        </span>{" "}
        &amp; joined Taboo Desires <span className="text-[#7b3aec]">{joinedAgo(seller.memberSince)}</span>
      </p>
      <Link href={profile} className={cn(WIDE_OUTLINED, "self-start")}>
        View ALL Items from {seller.name}
      </Link>
    </section>
  );
}

/**
 * Instant Content (a listing with locked photos and videos): title, cover picture and
 * the Unlock Now box on the left with the included content below, the seller panel on
 * the right, then "More from <seller>".
 */
function InstantContentView({
  listing,
  locked,
  buyBlocked,
}: {
  listing: Listing;
  locked: NonNullable<Listing["locked"]>;
  buyBlocked: string | null;
}) {
  const seller = listing.seller;
  const cover = listing.images.slice(0, 1);
  return (
    <div className="profile-design min-h-[calc(100dvh-3.5rem)] bg-[#0C0F15]">
      <div className="mx-auto flex max-w-[1170px] flex-col gap-5 px-5 py-8 lg:py-[60px]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,665fr)_minmax(0,445fr)]">
          <div className="flex min-w-0 flex-col gap-6 pt-[6px]">
            {(listing.status === "sold" || listing.status === "ended") && (
              <div className="flex gap-2">
                <Badge variant={listing.status === "sold" ? "destructive" : "secondary"}>
                  {listing.status === "sold" ? "Sold" : "Unsold"}
                </Badge>
              </div>
            )}
            <h1 className={cn(NURMA, "break-words text-[30px] leading-tight text-white")}>{listing.title}</h1>
            <Gallery images={cover} title={listing.title} />
            {!listing.isOwner && !locked.media && !buyBlocked && (
              <UnlockBox
                listingId={listing._id}
                locked={locked}
                priceCents={listing.priceCents}
                sellerName={seller?.name ?? "the seller"}
                isActive={listing.status === "active"}
              />
            )}
            {!listing.isOwner && locked.media && <AccessNotice expiresAt={locked.unlockExpiresAt} />}
            {!listing.isOwner && buyBlocked && <UpgradeNotice message={buyBlocked} showUpgrade={false} />}
            {listing.isOwner && <UnlockRequests listingId={listing._id} />}
            <div className="mt-4">
              <IncludedContent locked={locked} />
            </div>
          </div>

          <aside className={cn(OUTER, "flex min-w-0 flex-col self-start p-[19px]")}>
            {seller && <SellerCard seller={seller} />}
            <div className={cn(SANS, "mt-[18px] flex flex-col gap-[18px] px-[7px]")}>
              {listing.description ? (
                <ExpandableBio
                  text={listing.description}
                  className="gap-2 text-[14px] leading-6 [&>button]:h-[14px] [&>button]:px-1.5 [&>button]:py-0 [&>button]:text-[7px] [&>button]:uppercase [&>p]:text-white"
                />
              ) : (
                <p className="text-[14px] text-[#ffffff]">No description.</p>
              )}
              <p className={cn(SERIF, "text-[26px] leading-none text-[#7b3aec]")}>${(listing.priceCents / 100).toFixed(2)} USD</p>
              {/* Placeholder from the design; payment methods aren't wired up yet */}
              <h2 className={SUBHEAD}>Payment Methods</h2>
            </div>
            <div className="mt-[22px] border-t border-[#3b2a5e] pt-[22px]">
              {listing.isOwner ? (
                <OwnerActions listingId={listing._id} status={listing.status} isAuction={false} canDelete />
              ) : (
                <div className="flex flex-col gap-3">
                  {seller && !buyBlocked && (
                    <MessageSellerButton
                      listingId={listing._id}
                      sellerName={seller.name}
                      label="Message Seller"
                      icon={<MessageSquareText className="size-[22px]" strokeWidth={1.5} />}
                      className={cn(WIDE_ACTION, "gap-2")}
                    />
                  )}
                  <FavoriteButton
                    listingId={listing._id}
                    sellerId={listing.sellerId}
                    withLabel
                    className="h-10 self-start rounded-[5px] bg-[#141519] shadow-none"
                  />
                  <ReportButton target={{ kind: "listing", id: listing._id }} className="self-start" />
                </div>
              )}
            </div>
          </aside>
        </div>

        {seller && <MoreFromSeller seller={seller} currentId={listing._id} />}
      </div>
    </div>
  );
}

export default function ListingPage() {
  const { listingId } = useParams<{ listingId: Id<"listings"> }>();
  const listing = useQuery(api.listings.get, listingId ? { listingId } : "skip");
  const access = useAccess();

  if (listing === undefined) {
    return (
      <div className="profile-design min-h-[calc(100dvh-3.5rem)] bg-[#0C0F15]">
        <div className="mx-auto grid max-w-[1170px] gap-5 px-5 py-8 lg:grid-cols-[minmax(0,665fr)_minmax(0,445fr)] lg:py-[60px]">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="aspect-[8/5] w-full" />
          </div>
          <Skeleton className="h-[450px] w-full" />
        </div>
      </div>
    );
  }

  if (listing === null) {
    return (
      <Empty className="py-24">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingBag />
          </EmptyMedia>
          <EmptyTitle>Listing not found</EmptyTitle>
          <EmptyDescription>It may have been removed by the seller.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm" className="cursor-pointer">
            <Link href="/browse">Keep shopping</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  // Listings with locked photos and videos are Instant Content and have their own page
  if (listing.locked) {
    const instantBlocked =
      access && !access.can.buy ? deniedMessage("buy", access.accountType ?? undefined, access.ageVerified) : null;
    return <InstantContentView listing={listing} locked={listing.locked} buyBlocked={instantBlocked} />;
  }

  const comingSoon = () => toast("Coming soon in a future milestone!");
  const isAuction = listing.saleType === "auction";
  const locked = listing.locked as Listing["locked"];
  const seller = listing.seller;
  // Signed-in sellers (and members without an account type) can't buy
  const buyBlocked = access && !access.can.buy ? deniedMessage("buy", access.accountType ?? undefined, access.ageVerified) : null;
  const specs = [
    { label: "Size", value: listing.size },
    { label: "Wear time", value: CONDITION_LABEL[listing.condition] },
    {
      label: "Category",
      value: subcategoryInfo(listing.subcategory)
        ? `${CATEGORY_LABEL[listing.category]} · ${subcategoryInfo(listing.subcategory)!.label}`
        : CATEGORY_LABEL[listing.category],
    },
    { label: "Brand", value: listing.brand },
    { label: "Listed", value: formatDistanceToNow(listing._creationTime, { addSuffix: true }) },
  ].filter((s) => !!s.value);

  const badges = (
    <>
      {isAuction && <Badge className="rounded-[5px] uppercase">Auction</Badge>}
      {locked && (
        <Badge className="rounded-[5px] uppercase">
          <Lock /> Paywalled
        </Badge>
      )}
      {listing.status === "sold" && <Badge variant="destructive">Sold</Badge>}
      {listing.status === "ended" && <Badge variant="secondary">Unsold</Badge>}
      {listing.status === "hidden" && <Badge variant="destructive">Hidden: under review</Badge>}
    </>
  );
  const hasBadges = isAuction || !!locked || listing.status === "sold" || listing.status === "ended" || listing.status === "hidden";

  return (
    <div className="profile-design min-h-[calc(100dvh-3.5rem)] bg-[#0C0F15]">
      <div className="mx-auto flex max-w-[1170px] flex-col gap-5 px-5 py-8 lg:py-[60px]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,665fr)_minmax(0,445fr)]">
          {/* Title and picture */}
          <div className="flex min-w-0 flex-col gap-6 pt-[6px]">
            {hasBadges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
            <h1 className={cn(NURMA, "break-words text-[30px] leading-tight text-white")}>{listing.title}</h1>
            <Gallery images={listing.images} title={listing.title} locked={!!locked && !locked.media} />
            {locked?.media && <UnlockedMedia media={locked.media} />}
          </div>

          {/* Seller panel */}
          <aside className={cn(OUTER, "flex min-w-0 flex-col p-[19px]")}>
            {seller && <SellerCard seller={seller} />}

            <div className={cn(SANS, "mt-[18px] flex flex-col gap-[18px] px-[7px]")}>
              {listing.description ? (
                <ExpandableBio
                  text={listing.description}
                  className="gap-2 text-[14px] leading-6 [&>button]:h-[14px] [&>button]:px-1.5 [&>button]:py-0 [&>button]:text-[7px] [&>button]:uppercase [&>p]:text-white"
                />
              ) : (
                <p className="text-[14px] text-[#ffffff]">No description.</p>
              )}

              {!isAuction && (
                <p className={cn(SERIF, "text-[26px] leading-none text-[#7b3aec]")}>${(listing.priceCents / 100).toFixed(2)} USD</p>
              )}

              {isAuction && <AuctionPanel listingId={listing._id} isOwner={listing.isOwner} buyBlocked={buyBlocked} />}

              {/* Placeholder from the design; payment methods aren't wired up yet */}
              <h2 className={SUBHEAD}>Payment Methods</h2>

              {specs.length > 0 && (
                <div className="flex flex-col gap-1">
                  <h2 className={SUBHEAD}>Details</h2>
                  <dl>
                    {specs.map((s) => (
                      <Detail key={s.label} label={s.label} value={s.value!} />
                    ))}
                  </dl>
                </div>
              )}

              {locked && !listing.isOwner && !buyBlocked && (
                <BuyLockedPanel
                  listingId={listing._id}
                  locked={locked}
                  priceCents={listing.priceCents}
                  sellerName={seller?.name ?? "the seller"}
                  isActive={listing.status === "active"}
                />
              )}
            </div>

            <div className="mt-[22px] border-t border-[#3b2a5e] pt-[22px]">
              {listing.isOwner ? (
                <div className="flex flex-col gap-4">
                  <OwnerActions
                    listingId={listing._id}
                    status={listing.status}
                    isAuction={isAuction}
                    canDelete={!(isAuction && listing.auctionHasBids)}
                  />
                  {locked && <UnlockRequests listingId={listing._id} />}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {buyBlocked && !isAuction && <UpgradeNotice message={buyBlocked} showUpgrade={false} />}
                  {!isAuction && !locked && !buyBlocked && (
                    <Button variant="plain" size="none"
                      type="button"
                      className={WIDE_ACTION}
                      disabled={listing.status !== "active"}
                      onClick={comingSoon}
                    >
                      Buy now
                    </Button>
                  )}
                  {seller && !buyBlocked && (
                    <MessageSellerButton
                      listingId={listing._id}
                      sellerName={seller.name}
                      label="Message Seller"
                      showIcon={false}
                      className={WIDE_ACTION}
                    />
                  )}
                  <FavoriteButton
                    listingId={listing._id}
                    sellerId={listing.sellerId}
                    withLabel
                    className="h-10 self-start rounded-[5px] bg-[#141519] shadow-none"
                  />
                  <ReportButton target={{ kind: "listing", id: listing._id }} className="self-start" />
                </div>
              )}
            </div>
          </aside>
        </div>

        {seller && <MoreFromSeller seller={seller} currentId={listing._id} />}
      </div>
    </div>
  );
}
