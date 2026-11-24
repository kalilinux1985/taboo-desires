import { cn } from "@/lib/utils.ts";

/** The Taboo Coins icon (public/td-coins-icon.svg). Sized with className, like the lucide icons it replaces. */
export default function CoinIcon({ className }: { className?: string }) {
  return <img src="/td-coins-icon.svg" alt="" aria-hidden draggable={false} className={cn("inline-block size-4 shrink-0 object-contain", className)} />;
}
