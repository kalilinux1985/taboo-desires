import { useState, type ReactNode } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { EllipsisVertical, ImageIcon, Link2, Star, UserCog } from "lucide-react";
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

type Profile = NonNullable<FunctionReturnType<typeof api.users.getProfile>>;
type Tab = "overview" | "photos" | "reviews";

// Buyer profile design: #191a1f page, #212227 outer cards, #141519 inner cards
// with a faint #252b37 edge, violet #7b3aec, grey #a4a4a4 labels.
const SERIF = "[font-family:var(--font-profile-buyer),Cambria,Georgia,serif]";
const SANS = "[font-family:Arial,Helvetica,sans-serif]";
const OUTER = "rounded-[2px] bg-[#212227] shadow-[0_6px_14px_rgba(0,0,0,0.35)]";
const INNER =
  "rounded-[2px] border border-[#1e2129] bg-[#141519] shadow-[0_4px_10px_rgba(0,0,0,0.3)]";

const NOT_SET = "Not set";
const filled = (v: string | undefined) => !!v?.trim() && v !== "Prefer not to say";
/** "1 year ago", without date-fns' "about"/"over"/"almost". */
const joinedAgo = (date: string | number) =>
  formatDistanceToNow(new Date(date), { addSuffix: true }).replace(/^(about|over|almost) /, "");

/** Outer card holding an inner card, the design's section frame. */
function Frame({ className, innerClassName, children }: { className?: string; innerClassName?: string; children: ReactNode }) {
  return (
    <section className={cn(OUTER, "p-[19px]", className)}>
      <div className={cn(INNER, "h-full", innerClassName)}>{children}</div>
    </section>
  );
}

/** "Photos 1 Image" with the short violet underline. */
function SectionTitle({ title, count }: { title: string; count?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className={cn(SERIF, "flex flex-wrap items-baseline gap-x-1.5 leading-tight")}>
        <span className="text-[22px] text-white">{title}</span>
        {count && <span className="text-[16px] text-[#7b3aec]">{count}</span>}
      </h2>
      <span className="h-0.5 w-[60px] bg-[#7b3aec]/55" />
    </div>
  );
}

function Header({ profile }: { profile: Profile }) {
  const country = profile.buyerDetails.country ?? profile.location;
  const written = profile.reviewsWritten ?? { count: 0, average: 0 };
  const outlined = cn(
    "inline-flex h-[29px] cursor-pointer items-center justify-center rounded-[2px] border-2 border-[#5e2faf] text-[#7b3aec] transition-colors hover:bg-[#7b3aec] hover:text-white",
  );
  return (
    <Frame className="[grid-area:header]" innerClassName="flex lg:min-h-[345px] flex-col px-[22px] py-[18px]">
      <h1 className={cn(SERIF, "truncate text-[24px] uppercase leading-tight text-white")}>{profile.name}</h1>
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
            className={cn(
              SANS,
              "inline-flex h-[29px] w-[168px] cursor-pointer items-center justify-center rounded-[2px] bg-[#7b3aec] text-[10px] font-bold uppercase tracking-[0.02em] text-[#020516] transition-colors hover:bg-[#8a4ff0]",
            )}
          />
        )}
        {profile.isMe && (
          <Link
            href={settingsPathFor(profile.accountType)}
            className={cn(outlined, SERIF, "gap-1.5 px-2 text-[10px] font-bold uppercase")}
          >
            <UserCog className="size-3.5" strokeWidth={1.75} /> Edit Profile
          </Link>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="More options" className={cn(outlined, "w-[37px]")}>
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

function Tabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const tabs: { value: Tab; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "photos", label: "Photos" },
    { value: "reviews", label: "Reviews" },
  ];
  return (
    <nav aria-label="Profile sections" className={cn(OUTER, "flex flex-wrap gap-5 px-[19px] py-[7px] [grid-area:tabs]")}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          aria-current={value === t.value ? "page" : undefined}
          onClick={() => onChange(t.value)}
          className={cn(
            SERIF,
            "h-[30px] cursor-pointer rounded-[2px] bg-[#141519] px-[14px] text-[17px] transition-colors hover:text-[#7b3aec]",
            value === t.value ? "text-[#7b3aec]" : "text-white",
          )}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[15px] leading-[32px]">
      <dt className="text-[#a4a4a4]">{label}:</dt>
      <dd className="truncate text-right text-white">{value}</dd>
    </div>
  );
}

function About({ profile }: { profile: Profile }) {
  const d = profile.buyerDetails as Record<string, string | undefined>;
  const value = (key: string) => (filled(d[key]) ? d[key]! : NOT_SET);
  return (
    <Frame className="[grid-area:about]" innerClassName={cn(SANS, "lg:min-h-[345px] px-4 pb-6 pt-[21px]")}>
      <p className="text-center text-[15px] text-white">
        {profile.stats.followerCount} Followers - {profile.counts.following} Following
      </p>
      <span className="mx-0 mt-[21px] mb-3 block h-px bg-[#0a0c18]" />
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

const imagesLabel = (n: number) => `${n} ${n === 1 ? "Image" : "Images"}`;

/** Overview: the newest photos as small squares; any of them opens the Photos tab. */
function PhotosOverview({ userId, count, onOpen }: { userId: Id<"users">; count: number; onOpen: () => void }) {
  const { results, status } = usePaginatedQuery(api.users.photosByUser, { userId }, { initialNumItems: 10 });
  return (
    <Frame className="[grid-area:content]" innerClassName="lg:min-h-[345px] px-[22px] py-[28px]">
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
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#191a1f]">
      <div
        className={cn(
          "mx-auto grid max-w-[1170px] gap-5 px-5 py-8 lg:py-[97px]",
          "[grid-template-areas:'avatar'_'header'_'about'_'tabs'_'content']",
          "lg:grid-cols-[minmax(0,445fr)_minmax(0,665fr)] lg:grid-rows-[1fr_auto_auto] lg:[grid-template-areas:'avatar_header'_'avatar_tabs'_'about_content']",
        )}
      >
        <div className="relative aspect-square w-full max-w-[445px] self-start overflow-hidden rounded-[6px] bg-white shadow-[0_6px_14px_rgba(0,0,0,0.45)] [grid-area:avatar]">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageIcon className="size-[84%] text-[#adacb1]" strokeWidth={1.1} />
            </div>
          )}
        </div>

        <Header profile={profile} />
        <Tabs value={tab} onChange={setTab} />
        <About profile={profile} />

        {tab === "overview" && (
          <PhotosOverview userId={profile._id} count={profile.counts.photos} onOpen={() => setTab("photos")} />
        )}
        {tab === "photos" && (
          <Frame className="[grid-area:content]" innerClassName="flex lg:min-h-[345px] flex-col gap-6 px-[22px] py-[28px]">
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
          <Frame className="[grid-area:content]" innerClassName="flex lg:min-h-[345px] flex-col gap-6 px-[22px] py-[28px]">
            <SectionTitle
              title="Reviews"
              count={`${profile.reviewsWritten?.count ?? 0} Written`}
            />
            <BuyerReviews buyerId={profile._id} isMe={profile.isMe} />
          </Frame>
        )}
      </div>
    </div>
  );
}
