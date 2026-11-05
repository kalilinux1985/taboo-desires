"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@/lib/backend/react.tsx";
import { UserX } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import RequireAuth from "@/components/require-auth.tsx";
import SellerListings from "@/components/seller-listings.tsx";
import ProfilePhotos from "./_components/profile-photos.tsx";
import SellerReviews from "./_components/seller-reviews.tsx";
import BuyerProfile from "./_components/buyer-profile.tsx";
import ProfileSidebar from "./_components/profile-sidebar.tsx";
import CreateListingButton from "./_components/quick-listing.tsx";
import {
  ActivitySection,
  InstantSection,
  ProfilePanel,
  ShopSection,
} from "./_components/profile-sections.tsx";
import { PANEL, TAB_PILL, TEXT_FONT } from "./_lib/theme.ts";
import { useRecordProfileVisit } from "@/hooks/use-activity.ts";

const TABS = ["overview", "shop", "instant", "photos", "reviews"] as const;
type Tab = (typeof TABS)[number];
const isTab = (v: string): v is Tab => (TABS as readonly string[]).includes(v);

function SellerView({ sellerId }: { sellerId: Id<"users"> }) {
  const profile = useQuery(api.users.getProfile, { userId: sellerId });
  const [tab, setTab] = useState<Tab>("overview");
  useRecordProfileVisit(sellerId);

  if (profile === undefined) {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[20rem_1fr]">
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

  const showTab = (next: Tab) => {
    setTab(next);
    document.getElementById("profile-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const label = profile.isPro ? "Premium seller" : "Seller";

  return (
    <div className={cn(TEXT_FONT, "mx-auto grid max-w-6xl items-start gap-8 px-4 py-6 lg:grid-cols-[20rem_1fr] lg:gap-12")}>
      <ProfileSidebar profile={profile} />

      <Tabs
        id="profile-tabs"
        value={tab}
        onValueChange={(v) => isTab(v) && setTab(v)}
        className="min-w-0 scroll-mt-20 gap-6"
      >
        <div className={cn(PANEL, "flex flex-col gap-4 p-5")}>
          <div className="flex flex-wrap items-center gap-3 rounded-sm border border-white/[0.06] bg-[#050a16] p-3">
            <TabsList className="h-auto flex-1 flex-wrap justify-start gap-3 bg-transparent p-0">
              <TabsTrigger value="overview" className={TAB_PILL}>Overview</TabsTrigger>
              <TabsTrigger value="shop" className={TAB_PILL}>Shop</TabsTrigger>
              <TabsTrigger value="instant" className={TAB_PILL}>Instant Content</TabsTrigger>
              <TabsTrigger value="photos" className={TAB_PILL}>Photos</TabsTrigger>
              <TabsTrigger value="reviews" className={TAB_PILL}>Reviews</TabsTrigger>
            </TabsList>
            {profile.isMe && <CreateListingButton />}
          </div>
        </div>

        <TabsContent value="overview" className="flex flex-col gap-6">
          {profile.bio && (
            <ProfilePanel title={`About ${profile.name}`}>
              <p className="whitespace-pre-line break-words text-slate-300">{profile.bio}</p>
            </ProfilePanel>
          )}
          <ShopSection sellerId={profile._id} count={profile.counts.listings} onViewAll={() => showTab("shop")} />
          <InstantSection
            sellerId={profile._id}
            count={profile.counts.instantContent}
            onViewAll={() => showTab("instant")}
          />
          <ActivitySection authorId={profile._id} label={label} />
        </TabsContent>
        <TabsContent value="shop">
          <ProfilePanel title="Shop" count={`${profile.counts.listings} Listings`}>
            <SellerListings sellerId={profile._id} isMe={profile.isMe} kind="items" />
          </ProfilePanel>
        </TabsContent>
        <TabsContent value="instant">
          <ProfilePanel title="Instant Content" count={`${profile.counts.instantContent} Items`}>
            <SellerListings sellerId={profile._id} isMe={profile.isMe} kind="instant" />
          </ProfilePanel>
        </TabsContent>
        <TabsContent value="photos">
          <ProfilePanel title="Photos">
            {profile.isMe || profile.photos.length > 0 ? (
              <ProfilePhotos photos={profile.photos} isMe={profile.isMe} />
            ) : (
              <p className="text-sm text-slate-400">No photos yet</p>
            )}
          </ProfilePanel>
        </TabsContent>
        <TabsContent value="reviews">
          <ProfilePanel title="Reviews">
            <SellerReviews
              sellerId={profile._id}
              sellerName={profile.name}
              isMe={profile.isMe}
              rating={profile.stats.rating}
              reviewCount={profile.stats.reviewCount}
            />
          </ProfilePanel>
        </TabsContent>
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
