import Link from "next/link";
import { Crown, Gavel, Tag } from "lucide-react";
import { cn } from "@/lib/utils.ts";

const OPTIONS = [
  { value: "fixed", icon: Tag, title: "Fixed price", body: "Set a price. First buyer gets it." },
  { value: "auction", icon: Gavel, title: "Auction", body: "Set a starting bid. Highest bid wins." },
] as const;

type SaleType = (typeof OPTIONS)[number]["value"];

export default function SaleTypePicker({
  value,
  onChange,
  disabled,
  auctionLocked,
}: {
  value: SaleType;
  onChange: (value: SaleType) => void;
  disabled?: boolean;
  /** Free plan: auctions need Pro */
  auctionLocked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
    <div role="radiogroup" className="grid grid-cols-2 gap-3">
      {OPTIONS.map((o) => {
        const active = value === o.value;
        const locked = auctionLocked && o.value === "auction" && !active;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={(disabled && !active) || locked}
            onClick={() => !disabled && !locked && onChange(o.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-md border-2 bg-card p-4 text-left transition-colors",
              active ? "border-primary" : "border-border hover:border-foreground/40",
              disabled || locked ? "cursor-default" : "cursor-pointer",
              ((disabled && !active) || locked) && "opacity-50",
            )}
          >
            <span
              className={cn(
                "mb-1 flex size-8 items-center justify-center rounded-sm",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <o.icon className="size-4" />
            </span>
            <span className="flex items-center gap-2 font-display text-xl">
              {o.title}
              {locked && (
                <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-sans text-[10px] font-bold uppercase text-primary-foreground">
                  <Crown className="size-3" /> Pro
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">{o.body}</span>
          </button>
        );
      })}
    </div>
    {auctionLocked && !disabled && (
      <p className="text-xs text-muted-foreground">
        Auctions are a Pro feature.{" "}
        <Link href="/pricing" className="cursor-pointer font-semibold text-violet-600 underline-offset-4 hover:underline">
          Upgrade to Pro
        </Link>
      </p>
    )}
    </div>
  );
}
