import { ShoppingBag, Store } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export type AccountKind = "seller" | "buyer";

const LABELS = {
  seller: { label: "Seller", icon: Store },
  buyer: { label: "Buyer", icon: ShoppingBag },
} as const;

/** Shows whether a member is a seller or a buyer (plan tier is never shown). */
export default function AccountBadge({ kind, className }: { kind: AccountKind; className?: string }) {
  const { label, icon: Icon } = LABELS[kind];
  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[1px] bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground",
        className,
      )}
    >
      <Icon className="size-3" /> {label}
    </span>
  );
}
