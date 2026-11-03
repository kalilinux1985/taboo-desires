import { useNow } from "@/hooks/use-now.ts";
import { formatCountdown, URGENT_MS } from "@/lib/auctions.ts";
import { cn } from "@/lib/utils.ts";

/** Live ticking time-left label for an auction. */
export default function Countdown({
  endsAt,
  className,
}: {
  endsAt: string;
  className?: string;
}) {
  const now = useNow();
  const left = Date.parse(endsAt) - now;
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        left > 0 && left < URGENT_MS && "text-destructive",
        className,
      )}
    >
      {formatCountdown(left)}
    </span>
  );
}
