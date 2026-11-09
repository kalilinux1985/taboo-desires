import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils.ts";

/** Shown next to sellers an admin has verified. */
export default function VerifiedBadge({ className, label = false }: { className?: string; label?: boolean }) {
  return (
    <span
      title="Verified seller"
      aria-label="Verified seller"
      className={cn("inline-flex shrink-0 items-center gap-1 text-sky-400", className)}
    >
      <BadgeCheck className="size-[1.1em]" />
      {label && <span className="text-xs font-semibold">Verified</span>}
    </span>
  );
}
