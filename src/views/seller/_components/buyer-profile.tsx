import { useState } from "react";
import Link from "next/link";
import { EllipsisVertical, Link2, Star, UserCog } from "lucide-react";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType, Id } from "@/lib/backend/types.ts";
import { settingsPathFor } from "@/lib/settings.ts";
import { cn } from "@/lib/utils.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { BUYER_PHOTO_MAX } from "@/shared/accounts.ts";
import ProfilePhotos from "./profile-photos.tsx";
import BuyerReviews from "./buyer-reviews.tsx";
import MessageSellerButton from "./message-seller-dialog.tsx";
import { copyProfileLink } from "../_lib/profile-share.ts";
import { Detail, FILLED_ACTION, Frame, NURMA, OUTLINED_ACTION, ProfilePage, ProfilePicture, ProfileTabBar, SANS, SERIF, SectionTitle, imagesLabel, joinedAgo } from "../_lib/profile-design.tsx";

type Profile = NonNullable<FunctionReturnType<typeof api.users.getProfile>>;
type Tab = "overview" | "photos" | "reviews";

const NOT_SET = "Not set";
const filled = (v: string | undefined) => !!v?.trim() && v !== "Prefer not to say";

function Header({ profile }: { profile: Profile }) {
  const country = profile.buyerDetails.country ?? profile.location;
  const written = profile.reviewsWritten ?? { count: 0, average: 0 };
  return (
    <Frame className="[grid-area:header]" innerClassName="flex flex-col px-[22px] py-[18px] lg:min-h-[345px]">
      <h1 className={cn(NURMA, "truncate text-[24px] uppercase leading-tight tracking-[0.03em] text-white")}>{profile.name}</h1>
      <p className={cn(SERIF, "mt-1 flex flex-wrap items-center gap-x-4 text-[17px] text-[#7b3aec]")}>
        <span
          className="flex items-center gap-1"
          title={`Average rating this buyer gives sellers, from ${written.count} review${written.count === 1 ? "" : "s"}`}
        >
          <Star className="size-[18px]" strokeWidth={1.75} />
          {written.average.toFixed(1)} ({written.count})
        </span>
        {country && <span>{country}</span>}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-[18px]">
        {!profile.isMe && (
          <MessageSellerButton
            sellerId={profile._id}
            sellerName={profile.name}
            label="Message Buyer"
            showIcon={false}
            className={FILLED_ACTION}
          />
        )}
        {profile.isMe && (
          <Link
            href={settingsPathFor(profile.accountType)}
            className={cn(OUTLINED_ACTION, SERIF, "gap-1.5 px-2 text-[10px] font-bold uppercase")}
          >
            <UserCog className="size-3.5" strokeWidth={1.75} /> Edit Profile
          </Link>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="More options" className={cn(OUTLINED_ACTION, "w-[37px]")}>
              <EllipsisVertical className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem className="cursor-pointer" onSelect={() => copyProfileLink(profile._id)}>
              <Link2 /> Copy profile link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {profile.bio && (
        <p className={cn(SANS, "mt-6 whitespace-pre-wrap break-words text-[14px] leading-6 text-white")}>{profile.bio}</p>
      )}
    </Frame>
  );
}

function About({ profile }: { profile: Profile }) {
  const d = profile.buyerDetails as Record<string, string | undefined>;
  const value = (key: string) => (filled(d[key]) ? d[key]! : NOT_SET);
  return (
    <Frame className="[grid-area:about]" innerClassName={cn(SANS, "px-4 pb-6 pt-[21px] lg:min-h-[345px]")}>
      <p className="text-center text-[15px] text-white">
        {profile.stats.followerCount} Followers - {profile.counts.following} Following
      </p>
      <span className="mb-3 mt-[21px] block h-px bg-[#0a0c18]" />
      <dl className="flex flex-col">
        <Detail label="Gender" value={value("gender")} />
        <Detail label="Age" value={value("ageRange")} />
        <Detail label="Ethnicity" value={value("ethnicity")} />
        <Detail label="Body Size" value={value("bodySize")} />
        <Detail label="Joined" value={joinedAgo(profile.memberSince)} />
        <Detail label="Profile Visits" value={profile.activity.profileVisits.toLocaleString("en-US")} />
      </dl>
    </Frame>
  );
}

/** Overview: the newest photos as small squares; any of them opens the Photos tab. */
function PhotosOverview({ userId, count, onOpen }: { userId: Id<"users">; count: number; onOpen: () => void }) {
  const { results, status } = usePaginatedQuery(api.users.photosByUser, { userId }, { initialNumItems: 10 });
  return (
    <Frame className="[grid-area:content]" innerClassName="px-[22px] py-[28px] lg:min-h-[345px]">
      <SectionTitle title="Photos" count={imagesLabel(count)} />
      <div className="mt-[30px] flex flex-wrap gap-[18px]">
        {status === "LoadingFirstPage" ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="size-[110px]" />)
        ) : results.length === 0 ? (
          <p className={cn(SANS, "text-sm text-[#a4a4a4]")}>No photos yet.</p>
        ) : (
          results.slice(0, 10).map((p) => (
            <button
              key={p._id}
              type="button"
              onClick={onOpen}
              aria-label="Open photos"
              className="size-[110px] cursor-pointer overflow-hidden"
            >
              <img src={p.url} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))
        )}
      </div>
    </Frame>
  );
}

/** Buyer profile, laid out like the buyer profile design. */
export default function BuyerProfile({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <ProfilePage>
      <ProfilePicture url={profile.avatarUrl} name={profile.name} />
      <Header profile={profile} />
      <ProfileTabBar
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "photos", label: "Photos" },
          { value: "reviews", label: "Reviews" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <About profile={profile} />

      {tab === "overview" && (
        <PhotosOverview userId={profile._id} count={profile.counts.photos} onOpen={() => setTab("photos")} />
      )}
      {tab === "photos" && (
        <Frame className="[grid-area:content]" innerClassName="flex flex-col gap-6 px-[22px] py-[28px] lg:min-h-[345px]">
          <SectionTitle title="Photos" count={imagesLabel(profile.counts.photos)} />
          {profile.isMe || profile.counts.photos > 0 ? (
            <ProfilePhotos
              userId={profile._id}
              isMe={profile.isMe}
              total={profile.counts.photos}
              ownCount={profile.counts.profilePhotos}
              limit={BUYER_PHOTO_MAX}
            />
          ) : (
            <p className={cn(SANS, "text-sm text-[#a4a4a4]")}>No photos yet.</p>
          )}
        </Frame>
      )}
      {tab === "reviews" && (
        <Frame className="[grid-area:content]" innerClassName="flex flex-col gap-6 px-[22px] py-[28px] lg:min-h-[345px]">
          <SectionTitle title="Reviews" count={`${profile.reviewsWritten?.count ?? 0} Written`} />
          <BuyerReviews buyerId={profile._id} isMe={profile.isMe} />
        </Frame>
      )}
    </ProfilePage>
  );
}
