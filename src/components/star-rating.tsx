import { Star } from "lucide-react";
import { cn } from "@/lib/utils.ts";

const STARS = [1, 2, 3, 4, 5] as const;

/** Read-only star row; fills stars up to the rounded rating. */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  const filled = Math.round(rating);
  return (
    <span className={cn("flex items-center gap-0.5", className)} aria-label={`${rating} out of 5 stars`}>
      {STARS.map((s) => (
        <Star
          key={s}
          className={cn("size-4", s <= filled ? "fill-violet-500 text-violet-500" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}

/** Clickable 1-5 star picker. */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {STARS.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          aria-label={`${s} star${s > 1 ? "s" : ""}`}
          onClick={() => onChange(s)}
          className="cursor-pointer rounded-sm p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={cn("size-7", s <= value ? "fill-violet-500 text-violet-500" : "text-muted-foreground/40")}
          />
        </button>
      ))}
    </div>
  );
}

/** "4.8 (12 reviews)" summary, or "No reviews yet". */
export function RatingSummary({
  rating,
  reviewCount,
  className,
}: {
  rating: number | null;
  reviewCount: number;
  className?: string;
}) {
  if (rating === null)
    return <span className={cn("text-xs text-muted-foreground", className)}>No reviews yet</span>;
  return (
    <span className={cn("flex items-center gap-1.5 text-sm", className)}>
      <Stars rating={rating} />
      <span className="font-semibold">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
      </span>
    </span>
  );
}
