import { useState } from "react";
import { useParams } from "react-router-dom";
import { usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
import { EllipsisVertical, Link2, UserX } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import RequireAuth from "@/components/require-auth.tsx";
import SellerListings, { type ListingKind } from "@/components/seller-listings.tsx";
import { ListingCard } from "@/components/listing-card.tsx";
import ProfilePhotos from "./_components/profile-photos.tsx";
import SellerReviews from "./_components/seller-reviews.tsx";
import VerificationPanel from "./_components/verification-panel.tsx";
import ProfileHeader from "./_components/profile-header.tsx";
import OverviewCard from "./_components/overview-card.tsx";
import SectionPreview from "./_components/section-preview.tsx";
import BuyerProfile from "./_components/buyer-profile.tsx";
import { copyProfileLink } from "./_lib/profile-share.ts";
import { PILL } from "./_components/profile-tabs.ts";
import { useRecordProfileVisit } from "@/hooks/use-activity.ts";

const TABS = ["overview", "shop", "instant", "photos", "reviews"] as const;
type Tab = (typeof TABS)[number];
const isTab = (v: string): v is Tab => (TABS as readonly string[]).includes(v);

/** First few active listings of one kind, shown under the Overview card. */
function ListingPreview({ sellerId, kind }: { sellerId: Id<"users">; kind: ListingKind }) {
  const { results, status } = usePaginatedQuery(
    api.listings.bySeller,
    { sellerId, status: "active", kind },
    { initialNumItems: 4 },
  );
  if (status === "LoadingFirstPage") return <Skeleton className="h-48 w-full" />;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
      {results.slice(0, 4).map((l) => (
        <ListingCard key={l._id} listing={l} />
      ))}
    </div>
  );
}

function SellerView({ sellerId }: { sellerId: Id<"users"> }) {
  const profile = useQuery(api.users.getProfile, { userId: sellerId });
  const [tab, setTab] = useState<Tab>("overview");
  useRecordProfileVisit(sellerId);

  if (profile === undefined) {
    return (
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[22rem_1fr]">
        <Skeleton className="h-[36rem] w-full" />
        <Skeleton className="h-[28rem] w-full" />
      </div>
    );
  }
  if (profile === null) {
    return (
      <Empty className="py-24">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserX />
          </EmptyMedia>
          <EmptyTitle>Profile not found</EmptyTitle>
          <EmptyDescription>This profile doesn't exist.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (profile.accountType === "buyer") return <BuyerProfile profile={profile} />;

  const isSeller = true;
  const showTab = (next: Tab) => {
    setTab(next);
    document.getElementById("profile-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const copyLink = () => copyProfileLink(profile._id);

  return (
    <div className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-8 lg:grid-cols-[22rem_1fr]">
      <aside className="flex flex-col gap-6 lg:sticky lg:top-20">
        <ProfileHeader
          sellerId={profile._id}
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          verified={profile.verified}
          isMe={profile.isMe}
          isSeller={isSeller}
          accountType={profile.accountType}
          location={profile.sellerDetails.country ?? profile.location}
          rating={profile.stats.rating}
          listingCount={profile.counts.listings}
          instantCount={profile.counts.instantContent}
          onShowTab={showTab}
        />
        {profile.isMe && isSeller && <VerificationPanel />}
      </aside>

      <Tabs
        id="profile-tabs"
        value={tab}
        onValueChange={(v) => isTab(v) && setTab(v)}
        className="min-w-0 scroll-mt-20 gap-6"
      >
        <div className="flex items-start gap-1">
          <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="overview" className={PILL}>Overview</TabsTrigger>
            {isSeller && <TabsTrigger value="shop" className={PILL}>Shop</TabsTrigger>}
            {isSeller && <TabsTrigger value="instant" className={PILL}>Instant Content</TabsTrigger>}
            <TabsTrigger value="photos" className={PILL}>Photos</TabsTrigger>
            {isSeller && <TabsTrigger value="reviews" className={PILL}>Reviews</TabsTrigger>}
          </TabsList>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 cursor-pointer" aria-label="More options">
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onSelect={copyLink}>
                <Link2 /> Copy profile link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TabsContent value="overview" className="flex flex-col gap-8">
          <OverviewCard
            name={profile.name}
            bio={profile.bio}
            isSeller={isSeller}
            details={profile.sellerDetails}
            followers={profile.stats.followerCount}
            following={profile.counts.following}
            memberSince={profile.memberSince}
          />
          {isSeller && (
            <>
              <SectionPreview
                title="Shop"
                count={profile.counts.listings}
                unit="Listing"
                actionLabel="View All Listings"
                emptyLabel="No listings"
                onViewAll={() => showTab("shop")}
              >
                <ListingPreview sellerId={profile._id} kind="items" />
              </SectionPreview>
              <SectionPreview
                title="Instant Content"
                count={profile.counts.instantContent}
                unit="Items"
                actionLabel="View All Content"
                emptyLabel="No instant content"
                onViewAll={() => showTab("instant")}
              >
                <ListingPreview sellerId={profile._id} kind="instant" />
              </SectionPreview>
            </>
          )}
        </TabsContent>
        {isSeller && (
          <TabsContent value="shop">
            <SellerListings sellerId={profile._id} isMe={profile.isMe} kind="items" />
          </TabsContent>
        )}
        {isSeller && (
          <TabsContent value="instant">
            <SellerListings sellerId={profile._id} isMe={profile.isMe} kind="instant" />
          </TabsContent>
        )}
        <TabsContent value="photos">
          {profile.isMe || profile.photos.length > 0 ? (
            <ProfilePhotos photos={profile.photos} isMe={profile.isMe} />
          ) : (
            <p className="rounded-lg bg-accent/40 px-4 py-4 text-sm text-accent-foreground">No photos yet</p>
          )}
        </TabsContent>
        {isSeller && (
          <TabsContent value="reviews">
            <SellerReviews
              sellerId={profile._id}
              sellerName={profile.name}
              isMe={profile.isMe}
              rating={profile.stats.rating}
              reviewCount={profile.stats.reviewCount}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export function SellerPage() {
  const { sellerId } = useParams<{ sellerId: Id<"users"> }>();
  return sellerId ? <SellerView sellerId={sellerId} /> : null;
}

function MyShopInner() {
  const me = useQuery(api.users.getCurrentUser, {});
  if (me === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  if (me === null) return null;
  return <SellerView sellerId={me._id} />;
}

export function MyShopPage() {
  return (
    <RequireAuth message="Sign in to see your shop.">
      <MyShopInner />
    </RequireAuth>
  );
}
