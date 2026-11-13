import { formatDistanceToNowStrict } from "date-fns";
import { Award, Mars, NonBinary, Transgender, Venus } from "lucide-react";
import { Card } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import type { BuyerDetails } from "@/shared/buyerDetails.ts";
import { cn } from "@/lib/utils.ts";

const GENDER_ICONS: Record<string, typeof Venus> = {
  Female: Venus,
  Male: Mars,
  "Trans woman": Transgender,
  "Trans man": Transgender,
  "Non-binary": NonBinary,
};

type Badge = { key: string; label: string; description: string };

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className={cn("flex min-w-0 items-center gap-1 truncate text-right", strong && "font-bold")}>{value}</dd>
    </div>
  );
}

function BadgeList({ badges }: { badges: Badge[] }) {
  return (
    <Popover>
      <PopoverTrigger className="cursor-pointer hover:text-foreground">
        <span className="font-bold text-foreground">{badges.length}</span> Badges
      </PopoverTrigger>
      <PopoverContent className="w-64">
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No badges earned yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {badges.map((b) => (
              <li key={b.key} className="flex items-start gap-2">
                <Award className="mt-0.5 size-4 shrink-0 text-violet-600" />
                <div>
                  <p className="text-sm font-semibold">{b.label}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

type Props = {
  name: string;
  details: BuyerDetails;
  followers: number;
  following: number;
  badges: Badge[];
  memberSince: number;
  profileVisits: number;
};

/** Buyer "About" card, laid out like the reference profile. */
export default function BuyerOverviewCard(p: Props) {
  const GenderIcon = p.details.gender ? GENDER_ICONS[p.details.gender] : undefined;
  const lookingFor = p.details.lookingFor ?? [];
  return (
    <Card className="gap-0 p-5">
      <h2 className="text-2xl font-bold">About {p.name}</h2>
      <p className="flex flex-wrap items-center gap-x-2 pt-2 text-sm text-muted-foreground">
        <span>
          <span className="font-bold text-foreground">{p.followers}</span> Followers
        </span>
        <span>-</span>
        <span>
          <span className="font-bold text-foreground">{p.following}</span> Following
        </span>
        <span>-</span>
        <BadgeList badges={p.badges} />
      </p>

      <Separator className="my-4 bg-white/25" />
      <dl>
        {p.details.gender && (
          <Row
            label="Gender"
            strong
            value={
              <>
                {GenderIcon && <GenderIcon className="size-4 text-violet-600" />}
                {p.details.gender}
              </>
            }
          />
        )}
        {p.details.ageRange && <Row label="Age" value={p.details.ageRange} strong />}
        <Row label="Joined" value={formatDistanceToNowStrict(p.memberSince, { addSuffix: true })} />
        <Row label="Profile Visits" value={p.profileVisits.toLocaleString()} />
      </dl>

      <Separator className="my-5 bg-white/25" />
      <h3 className="text-xl font-bold">What I&apos;m looking for</h3>
      <div className="flex flex-wrap gap-2 pt-3">
        {lookingFor.length === 0 ? (
          <span className="text-sm text-muted-foreground">Nothing listed yet.</span>
        ) : (
          lookingFor.map((item) => (
            <span key={item} className="rounded-[1px] bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
              {item}
            </span>
          ))
        )}
      </div>
    </Card>
  );
}
