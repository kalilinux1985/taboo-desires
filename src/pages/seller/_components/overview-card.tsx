import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronDown, Mars, NonBinary, Transgender, Venus } from "lucide-react";
import { Card } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx";
import { SELLER_DETAIL_FIELDS, type SellerDetails } from "@/shared/sellerDetails.ts";
import { cn } from "@/lib/utils.ts";

const GENDER_ICONS: Record<string, typeof Venus> = {
  Female: Venus,
  Male: Mars,
  "Trans woman": Transgender,
  "Trans man": Transgender,
  "Non-binary": NonBinary,
};

// Shown in the header card instead, so excluded here
const HIDDEN_KEYS = new Set<string>(["country"]);

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className={cn("flex min-w-0 items-center gap-1 truncate text-right", strong && "font-bold")}>{value}</dd>
    </div>
  );
}

type Props = {
  name: string;
  bio: string | null;
  isSeller: boolean;
  details: SellerDetails;
  followers: number;
  following: number;
  memberSince: number;
};

/** "About {name}" card: social counts, bio, seller details with a More expander, and join date. */
export default function OverviewCard({ name, bio, isSeller, details, followers, following, memberSince }: Props) {
  const [open, setOpen] = useState(false);
  const filled = SELLER_DETAIL_FIELDS.filter((f) => !HIDDEN_KEYS.has(f.key) && details[f.key]);
  // Gender first, matching the reference layout
  const primary = filled
    .filter((f) => "primary" in f && f.primary)
    .sort((a, b) => Number(b.key === "gender") - Number(a.key === "gender"));
  const extra = filled.filter((f) => !("primary" in f && f.primary));

  const renderValue = (key: string, value: string) => {
    const Icon = key === "gender" ? GENDER_ICONS[value] : undefined;
    return (
      <>
        {Icon && <Icon className="size-4 text-violet-500" />}
        {value}
      </>
    );
  };

  return (
    <Card className="min-h-[28rem] gap-0 p-5">
      <h2 className="text-2xl font-bold">About {name}</h2>
      <p className="pt-2 text-sm text-muted-foreground">
        <span className="font-bold text-foreground">{followers}</span> Followers
        <span className="px-2">-</span>
        <span className="font-bold text-foreground">{following}</span> Following
      </p>
      <p className="min-h-32 whitespace-pre-line break-words py-5 text-sm">
        {bio ?? <span className="text-muted-foreground">No bio yet.</span>}
      </p>

      {isSeller && filled.length > 0 && (
        <>
          <Separator className="bg-white/10" />
          <Collapsible open={open} onOpenChange={setOpen} className="py-2">
            <dl>
              {primary.map((f) => (
                <Row key={f.key} label={f.label} value={renderValue(f.key, details[f.key] ?? "")} strong />
              ))}
              <CollapsibleContent>
                {extra.map((f) => (
                  <Row key={f.key} label={f.label} value={details[f.key]} strong />
                ))}
              </CollapsibleContent>
            </dl>
            {extra.length > 0 && (
              <CollapsibleTrigger className="flex cursor-pointer items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground">
                {open ? "Less" : "More"}
                <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
              </CollapsibleTrigger>
            )}
          </Collapsible>
        </>
      )}

      <Separator className="bg-white/10" />
      <dl className="pt-2">
        <Row label="Joined" value={formatDistanceToNowStrict(memberSince, { addSuffix: true })} />
      </dl>
    </Card>
  );
}
