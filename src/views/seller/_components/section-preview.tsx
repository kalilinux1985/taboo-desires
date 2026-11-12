import type { ReactNode } from "react";
import { Button } from "@/components/ui/button.tsx";
import { OUTLINE_VIOLET } from "./outline-violet-button.ts";

/** Overview-tab teaser: "Shop 3 Listing" heading, a View All button, and an empty note when there's nothing. */
export default function SectionPreview({
  title,
  count,
  unit,
  actionLabel,
  emptyLabel,
  onViewAll,
  children,
}: {
  title: string;
  count: number;
  unit: string;
  actionLabel: string;
  emptyLabel: string;
  onViewAll: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-white/28 pb-8">
      <h2 className="w-fit border-b-2 border-violet-600 pb-1.5 text-2xl font-bold">
        {title} <span className="font-normal text-violet-600">{count} {unit}</span>
      </h2>
      <Button variant="ghost" className={OUTLINE_VIOLET} onClick={onViewAll}>
        {actionLabel}
      </Button>
      {count === 0 ? (
        <div className="rounded-[1px] bg-accent/40 px-4 py-4 text-sm text-accent-foreground">{emptyLabel}</div>
      ) : (
        children
      )}
    </section>
  );
}
