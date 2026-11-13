"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@/lib/backend/react.tsx";
import { ChevronLeft, UserX } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
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
import ProfilePhotos from "./_components/profile-photos.tsx";
import SellerReviews from "./_components/seller-reviews.tsx";
import BuyerProfile from "./_components/buyer-profile.tsx";
import ProfileSidebar, { ProfileHeaderCard } from "./_components/profile-sidebar.tsx";
import ProfileCompactHeader from "./_components/profile-compact-header.tsx";
import {
  ActivitySection,
  InstantSection,
  ProfilePanel,
  ShopSection,
} from "./_components/profile-sections.tsx";
import { TEXT_FONT } from "./_lib/theme.ts";
import { useRecordProfileVisit } from "@/hooks/use-activity.ts";

const TABS = ["overview", "shop", "instant", "photos", "reviews"] as const;
type Tab = (typeof TABS)[number];

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // The design has no tab bar: the Overview is the profile, and the Shop and
  // Instant Content counts open the full lists, which link back to it.
  if (tab === "overview") {
    return (
      <div
        className={cn(
          TEXT_FONT,
          "mx-auto grid max-w-[60rem] items-start gap-6 px-4 py-6 lg:grid-cols-[20rem_1fr] lg:gap-[52px]",
        )}
      >
        <ProfileSidebar profile={profile} />
        <div className="flex min-w-0 flex-col gap-5">
          <ProfileHeaderCard profile={profile} />
          <ShopSection sellerId={profile._id} count={profile.counts.listings} onViewAll={() => showTab("shop")} />
          <InstantSection
            sellerId={profile._id}
            count={profile.counts.instantContent}
            onViewAll={() => showTab("instant")}
          />
          <ActivitySection authorId={profile._id} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(TEXT_FONT, "mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6")}>
      <ProfileCompactHeader profile={profile} />
      <button
        type="button"
        onClick={() => showTab("overview")}
        className="flex cursor-pointer items-center gap-1.5 self-start text-sm text-violet-600 hover:underline"
      >
        <ChevronLeft className="size-4" /> Back to profile
      </button>
      {tab === "shop" && (
        <ProfilePanel title="Shop" count={`${profile.counts.listings} Listings`}>
          <SellerListings sellerId={profile._id} isMe={profile.isMe} kind="items" />
        </ProfilePanel>
      )}
      {tab === "instant" && (
        <ProfilePanel title="Instant Content" count={`${profile.counts.instantContent} Items`}>
          <SellerListings sellerId={profile._id} isMe={profile.isMe} kind="instant" />
        </ProfilePanel>
      )}
      {tab === "photos" && (
        <ProfilePanel title="Photos" count={`${profile.counts.photos} ${profile.counts.photos === 1 ? "image" : "images"}`}>
          {profile.isMe || profile.counts.photos > 0 ? (
            <ProfilePhotos userId={profile._id} isMe={profile.isMe} total={profile.counts.photos} />
          ) : (
            <p className="text-sm text-slate-400">No photos yet</p>
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
