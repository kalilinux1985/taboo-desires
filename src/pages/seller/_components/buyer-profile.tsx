import { useState } from "react";
import { EllipsisVertical, Link2 } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import ProfilePhotos from "./profile-photos.tsx";
import BuyerHeader from "./buyer-header.tsx";
import BuyerOverviewCard from "./buyer-overview-card.tsx";
import BuyerReviews from "./buyer-reviews.tsx";
import SectionPreview from "./section-preview.tsx";
import { copyProfileLink } from "../_lib/profile-share.ts";
import { PILL } from "./profile-tabs.ts";

type Profile = NonNullable<FunctionReturnType<typeof api.users.getProfile>>;

const TABS = ["overview", "photos", "reviews"] as const;
type Tab = (typeof TABS)[number];
const isTab = (v: string): v is Tab => (TABS as readonly string[]).includes(v);

function PhotoStrip({ photos }: { photos: Profile["photos"] }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {photos.map((p) => (
        <div key={p._id} className="aspect-square overflow-hidden rounded-md bg-muted">
          <img src={p.url} alt="" className="size-full object-cover" />
        </div>
      ))}
    </div>
  );
}

/** Buyer profile: photo card, Overview / Photos / Reviews tabs, About card and photo preview. */
export default function BuyerProfile({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<Tab>("overview");
  const showTab = (next: Tab) => {
    setTab(next);
    document.getElementById("profile-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const country = profile.buyerDetails.country ?? profile.location;

  return (
    <div className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-8 lg:grid-cols-[22rem_1fr]">
      <aside className="lg:sticky lg:top-20">
        <BuyerHeader
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          verified={profile.verified}
          isMe={profile.isMe}
          country={country}
          lastSeenAt={profile.activity.lastSeenAt}
        />
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
            <TabsTrigger value="photos" className={PILL}>Photos</TabsTrigger>
            <TabsTrigger value="reviews" className={PILL}>Reviews</TabsTrigger>
          </TabsList>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 cursor-pointer" aria-label="More options">
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onSelect={() => copyProfileLink(profile._id)}>
                <Link2 /> Copy profile link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TabsContent value="overview" className="flex flex-col gap-8">
          <BuyerOverviewCard
            name={profile.name}
            details={profile.buyerDetails}
            followers={profile.stats.followerCount}
            following={profile.counts.following}
            badges={profile.badges}
            memberSince={profile.memberSince}
            profileVisits={profile.activity.profileVisits}
          />
          <SectionPreview
            title="Photos"
            count={profile.photos.length}
            unit={profile.photos.length === 1 ? "image" : "images"}
            actionLabel="View All Images"
            emptyLabel="No photos yet"
            onViewAll={() => showTab("photos")}
          >
            <PhotoStrip photos={profile.photos} />
          </SectionPreview>
        </TabsContent>
        <TabsContent value="photos">
          {profile.isMe || profile.photos.length > 0 ? (
            <ProfilePhotos photos={profile.photos} isMe={profile.isMe} />
          ) : (
            <p className="rounded-lg bg-accent/40 px-4 py-4 text-sm text-accent-foreground">No photos yet</p>
          )}
        </TabsContent>
        <TabsContent value="reviews">
          <BuyerReviews buyerId={profile._id} isMe={profile.isMe} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
