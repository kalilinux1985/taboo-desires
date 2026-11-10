"use client";

import { useState } from "react";
import Link from "next/link";
import { useNavigate } from "@/lib/navigation.ts";
import { useParams } from "next/navigation";
import { subcategoryInfo } from "@/shared/subcategories.ts";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Lock, MapPin, Pencil, ShoppingBag, Trash2 } from "lucide-react";
import MessageSellerButton from "./_components/message-seller-button.tsx";
import AuctionPanel from "./_components/auction-panel.tsx";
import RelistAuctionButton from "./_components/relist-auction-button.tsx";
import { BuyLockedPanel, UnlockRequests, UnlockedMedia } from "./_components/locked-content.tsx";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Doc, Id } from "@/lib/backend/types.ts";
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
import {
  CATEGORY_LABEL,
  CONDITION_LABEL,
  formatPrice,
  getErrorMessage,
} from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import AccountBadge from "@/components/account-badge.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { RatingSummary } from "@/components/star-rating.tsx";
import VerifiedBadge from "@/components/verified-badge.tsx";
import FavoriteButton from "@/components/favorite-button.tsx";
import UpgradeNotice from "@/components/upgrade-notice.tsx";
import { useAccess } from "@/hooks/use-access.ts";
import { deniedMessage } from "@/shared/accounts.ts";

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
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        {current && <img src={current.url} alt={title} className="size-full object-cover" />}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 text-white">
            <span className="flex size-14 items-center justify-center rounded-full text-violet-600 drop-shadow-md">
              <Lock className="size-6" />
            </span>
            <span className="font-display text-2xl">Locked content</span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "aspect-square cursor-pointer overflow-hidden rounded-sm border-2",
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img src={img.url} alt="" className="size-full object-cover" />
            </button>
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
      {!isAuction && (
        <Button
          variant="secondary"
          className="cursor-pointer"
          onClick={() =>
            run(
              () => setStatus({ listingId, status: status === "active" ? "sold" : "active" }),
              status === "active" ? "Marked as sold" : "Listing is live again",
            )
          }
        >
          <CheckCircle2 /> {status === "active" ? "Mark as sold" : "Relist"}
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

export default function ListingPage() {
  const { listingId } = useParams<{ listingId: Id<"listings"> }>();
  const listing = useQuery(api.listings.get, listingId ? { listingId } : "skip");
  const access = useAccess();

  if (listing === undefined) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-32 w-full" />
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

  const comingSoon = () => toast("Coming soon in a future milestone!");
  const isAuction = listing.saleType === "auction";
  const locked = listing.locked;
  // Signed-in sellers (and members without an account type) can't buy
  const buyBlocked = access && !access.can.buy ? deniedMessage("buy", access.accountType ?? undefined) : null;
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
  ];

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-8">
        <Gallery images={listing.images} title={listing.title} locked={!!locked && !locked.media} />
        {locked?.media && <UnlockedMedia media={locked.media} />}
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {listing.brand}
            </p>
            {isAuction && <Badge className="rounded-sm uppercase">Auction</Badge>}
            {locked && (
              <Badge className="rounded-sm uppercase">
                <Lock /> Paywalled
              </Badge>
            )}
            {listing.status === "sold" && <Badge variant="destructive">Sold</Badge>}
            {listing.status === "ended" && <Badge variant="secondary">Unsold</Badge>}
          </div>
          <h1 className="font-display text-4xl leading-none break-words md:text-5xl">
            {listing.title}
          </h1>
          {!isAuction && (
            <p className="font-mono text-3xl font-bold">{formatPrice(listing.priceCents)}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Listed {formatDistanceToNow(listing._creationTime, { addSuffix: true })}
          </p>
        </div>

        {isAuction && <AuctionPanel listingId={listing._id} isOwner={listing.isOwner} buyBlocked={buyBlocked} />}

        {locked && !listing.isOwner && !buyBlocked && (
          <BuyLockedPanel
            listingId={listing._id}
            locked={locked}
            priceCents={listing.priceCents}
            sellerName={listing.seller?.name ?? "the seller"}
            isActive={listing.status === "active"}
          />
        )}

        {listing.isOwner ? (
          <>
          <OwnerActions
            listingId={listing._id}
            status={listing.status}
            isAuction={isAuction}
            canDelete={!(isAuction && listing.auctionHasBids)}
          />
          {locked && <UnlockRequests listingId={listing._id} />}
          </>
        ) : (
          <>
          {buyBlocked && !isAuction && <UpgradeNotice message={buyBlocked} showUpgrade={false} />}
          <div className="flex flex-col gap-2 sm:flex-row">
            {!isAuction && !locked && !buyBlocked && (
              <Button
                size="lg"
                className="flex-1 cursor-pointer"
                disabled={listing.status !== "active"}
                onClick={comingSoon}
              >
                <ShoppingBag /> Buy now
              </Button>
            )}
            {listing.seller && !buyBlocked && (
              <MessageSellerButton listingId={listing._id} sellerName={listing.seller.name} />
            )}
            <FavoriteButton
              listingId={listing._id}
              sellerId={listing.sellerId}
              withLabel
              className="h-10 bg-secondary shadow-none"
            />
          </div>
          </>
        )}

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border">
          {specs.map((s) => (
            <div key={s.label} className="bg-card p-3">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</dt>
              <dd className="truncate font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>

        {listing.description && (
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl">Details</h2>
            <p className="whitespace-pre-wrap break-words text-muted-foreground">
              {listing.description}
            </p>
          </div>
        )}

        {listing.seller && (
          <Link
            href={`/seller/${listing.seller._id}`}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-[#383b3d] bg-card shadow-[inset_4px_4px_14px_-4px_var(--color-violet-800)] p-4 transition-colors hover:bg-secondary"
          >
            <ProfileAvatar
              name={listing.seller.name}
              url={listing.seller.avatarUrl}
              className="size-11 text-xl"
            />
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-2 font-semibold">
                <span className="truncate">{listing.seller.name}</span>
                {listing.seller.verified && <VerifiedBadge />}
                <AccountBadge kind="seller" />
              </p>
              <RatingSummary
                rating={listing.seller.rating}
                reviewCount={listing.seller.reviewCount}
                className="text-xs"
              />
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                {listing.seller.location && (
                  <>
                    <MapPin className="size-3" /> {listing.seller.location} ·{" "}
                  </>
                )}
                Member since {new Date(listing.seller.memberSince).getFullYear()}
              </p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
