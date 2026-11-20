"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@/lib/backend/react.tsx";
import { Lock, UserX } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import RequireAuth from "@/components/require-auth.tsx";
import SellerListings from "@/components/seller-listings.tsx";
import { ShopHeader, ShopTab } from "./_components/shop-tab.tsx";
import ProfileMenu from "./_components/profile-menu.tsx";
import ProfilePhotos from "./_components/profile-photos.tsx";
import SellerReviews from "./_components/seller-reviews.tsx";
import BuyerProfile from "./_components/buyer-profile.tsx";
import SellerAbout, { ProfileHeaderCard } from "./_components/profile-sidebar.tsx";
import {
  ActivitySection,
  InstantSection,
  PhotosSection,
  ProfilePanel,
  ShopSection,
} from "./_components/profile-sections.tsx";
import { imagesLabel, ProfilePage, ProfilePicture, ProfileTabBar } from "./_lib/profile-design.tsx";
import { useRecordProfileVisit } from "@/hooks/use-activity.ts";

const TABS = ["overview", "shop", "instant", "photos", "reviews"] as const;
type Tab = (typeof TABS)[number];

function SellerView({ sellerId }: { sellerId: Id<"users"> }) {
  const profile = useQuery(api.users.getProfile, { userId: sellerId });
  const access = useQuery(api.users.profileAccess, { userId: sellerId });
  const [tab, setTab] = useState<Tab>("overview");
  useRecordProfileVisit(sellerId);

  if (profile === undefined || (profile === null && access === undefined)) {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[20rem_1fr]">
        <Skeleton className="h-[36rem] w-full" />
        <Skeleton className="h-[28rem] w-full" />
      </div>
    );
  }
  if (profile === null && access?.locked) {
    return (
      <Empty className="py-24">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lock />
          </EmptyMedia>
          <EmptyTitle>This profile is private</EmptyTitle>
          <EmptyDescription>{access.name} has chosen to keep their profile private.</EmptyDescription>
        </EmptyHeader>
      </Empty>
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

  const tabs: { value: Tab; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "shop", label: "Shop" },
    { value: "instant", label: "Instant Content" },
    { value: "photos", label: "Photos" },
    { value: "reviews", label: "Reviews" },
  ];

  // The Shop tab is full width: small header, tab bar, then the listing grid
  if (tab === "shop") {
    return (
      <div className="profile-design min-h-[calc(100dvh-3.5rem)] bg-[#0C0F15]">
        <div className="mx-auto flex max-w-[1170px] flex-col gap-[22px] px-5 py-6">
          <ShopHeader
            name={profile.name}
            avatarUrl={profile.avatarUrl}
            rating={profile.stats.rating}
            reviewCount={profile.stats.reviewCount}
            verified={profile.verified}
            onReviews={() => setTab("reviews")}
          />
          <ProfileTabBar
            tabs={tabs}
            value={tab}
            onChange={setTab}
            trailing={!profile.isMe ? <ProfileMenu userId={profile._id} targetType="seller" /> : undefined}
          />
          <ShopTab sellerId={profile._id} total={profile.counts.listings} isMe={profile.isMe} />
        </div>
      </div>
    );
  }

  return (
    <ProfilePage>
      <ProfilePicture url={profile.avatarUrl} name={profile.name} />
      <ProfileHeaderCard profile={profile} onReviews={() => setTab("reviews")} />
      <ProfileTabBar tabs={tabs} value={tab} onChange={setTab} />
      <SellerAbout profile={profile} />

      <div className="flex min-w-0 flex-col gap-5 [grid-area:content]">
        {tab === "overview" && (
          <>
            <ShopSection sellerId={profile._id} count={profile.counts.listings} onViewAll={() => setTab("shop")} />
            <InstantSection
              sellerId={profile._id}
              count={profile.counts.instantContent}
              onViewAll={() => setTab("instant")}
            />
            <PhotosSection userId={profile._id} count={profile.counts.photos} onViewAll={() => setTab("photos")} />
            <ActivitySection authorId={profile._id} />
          </>
        )}
        {tab === "instant" && (
          <ProfilePanel title="Instant Content" count={`${profile.counts.instantContent} Items`}>
            <SellerListings sellerId={profile._id} isMe={profile.isMe} kind="instant" />
          </ProfilePanel>
        )}
        {tab === "photos" && (
          <ProfilePanel title="Photos" count={imagesLabel(profile.counts.photos)}>
            {profile.isMe || profile.counts.photos > 0 ? (
              <ProfilePhotos userId={profile._id} isMe={profile.isMe} total={profile.counts.photos} />
            ) : (
              <p className="text-sm text-[#ffffff]">No photos yet</p>
            )}
          </ProfilePanel>
        )}
        {tab === "reviews" && (
          <ProfilePanel title="Reviews">
            <SellerReviews
              sellerId={profile._id}
              sellerName={profile.name}
              isMe={profile.isMe}
              rating={profile.stats.rating}
              reviewCount={profile.stats.reviewCount}
            />
          </ProfilePanel>
        )}
      </div>
    </ProfilePage>
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
