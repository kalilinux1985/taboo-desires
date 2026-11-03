import { Link } from "react-router-dom";
import { Images, MapPin, ShoppingBag, UserRound } from "lucide-react";
import { settingsPathFor, type SettingsKind } from "@/lib/settings.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Stars } from "@/components/star-rating.tsx";
import VerifiedBadge from "@/components/verified-badge.tsx";
import FollowButton from "./follow-button.tsx";
import CustomRequestButton from "@/components/custom-request-button.tsx";
import { OUTLINE_VIOLET } from "./outline-violet-button.ts";

type Props = {
  sellerId: Id<"users">;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  isMe: boolean;
  isSeller: boolean;
  accountType: SettingsKind | null;
  location: string | null;
  rating: number | null;
  listingCount: number;
  instantCount: number;
  onShowTab: (tab: "shop" | "instant") => void;
};

function StatChip({ icon: Icon, label, onClick }: { icon: typeof ShoppingBag; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary/70"
    >
      <Icon className="size-3.5 text-violet-500" /> {label}
    </button>
  );
}

const plural = (n: number, word: string) => `${n} ${word}`;

/** Big profile picture with the name card beneath it, as on the reference profile. */
export default function ProfileHeader(p: Props) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex aspect-square w-full items-center justify-center bg-secondary/40">
        {p.avatarUrl ? (
          <img src={p.avatarUrl} alt={p.name} className="size-full object-cover" />
        ) : (
          <UserRound className="size-2/3 text-muted-foreground/40" strokeWidth={1.25} />
        )}
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
            {p.isSeller ? "Seller" : "Buyer"}
          </span>
          <h1 className="flex min-w-0 items-center gap-2 text-3xl font-bold">
            <span className="truncate">{p.name}</span>
            {p.verified && <VerifiedBadge className="text-xl" />}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {p.isSeller && <Stars rating={p.rating ?? 0} />}
            {p.isSeller && p.location && <span>-</span>}
            {p.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 text-violet-500" /> {p.location}
              </span>
            )}
          </p>
        </div>
        {p.isMe ? (
          <Button asChild variant="ghost" className={OUTLINE_VIOLET}>
            <Link to={settingsPathFor(p.accountType)}>Edit Profile</Link>
          </Button>
        ) : (
          p.isSeller && (
            <div className="flex flex-col gap-2 [&>button]:w-full">
              <CustomRequestButton sellerId={p.sellerId} sellerName={p.name} className="w-full" />
              <FollowButton sellerId={p.sellerId} />
            </div>
          )
        )}
        <Separator className="bg-white/10" />
        {p.isSeller && (
          <div className="flex flex-wrap gap-2 pt-6">
            <StatChip icon={ShoppingBag} label={plural(p.listingCount, "Listing")} onClick={() => p.onShowTab("shop")} />
            <StatChip icon={Images} label={plural(p.instantCount, "Instant Content")} onClick={() => p.onShowTab("instant")} />
          </div>
        )}
      </div>
    </Card>
  );
}
