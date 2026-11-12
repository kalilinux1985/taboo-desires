import Link from "next/link";
import { Lock, MapPin, Star, UserRound } from "lucide-react";
import { settingsPathFor } from "@/lib/settings.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import VerifiedBadge from "@/components/verified-badge.tsx";
import { OUTLINE_VIOLET } from "./outline-violet-button.ts";

// Heartbeats are written at most once a minute, so 5 minutes leaves room for slow tabs
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const isOnline = (lastSeenAt: string | null) =>
  !!lastSeenAt && Date.now() - Date.parse(lastSeenAt) < ONLINE_WINDOW_MS;

type Props = {
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  isMe: boolean;
  country: string | null;
  lastSeenAt: string | null;
};

/** Buyer profile card: photo with online badge, name, location and edit action. */
export default function BuyerHeader(p: Props) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="relative flex aspect-square w-full items-center justify-center bg-secondary/40">
        {p.avatarUrl ? (
          <img src={p.avatarUrl} alt={p.name} className="size-full object-cover" />
        ) : (
          <UserRound className="size-2/3 text-muted-foreground/40" strokeWidth={1.25} />
        )}
        {isOnline(p.lastSeenAt) && (
          <span className="absolute right-0 top-0 rounded-bl-[1px] bg-emerald-500 px-2.5 py-0.5 text-xs font-bold text-white">
            Online
          </span>
        )}
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-violet-600">
            Buyer <Lock className="size-3" />
          </span>
          <h1 className="flex min-w-0 items-center gap-2 text-3xl font-bold">
            <span className="truncate">{p.name}</span>
            {p.verified && <VerifiedBadge className="text-xl" />}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <Star className="size-4 text-violet-600" />
            <span>-</span>
            {p.country && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 text-violet-600" /> {p.country}
              </span>
            )}
          </p>
        </div>
        {p.isMe && (
          <Button asChild variant="ghost" className={OUTLINE_VIOLET}>
            <Link href={settingsPathFor("buyer")}>Edit Profile</Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
