"use client";

import { useMemo, useState } from "react";
import { Funnel } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import {
  FilterGroups,
  SHOP_FILTER_GROUPS,
  toArgs,
  useFilterSelection,
} from "@/components/shop/shop-filters.tsx";
import { CategoryGrid, type BrowseArgs } from "@/components/shop/shop-grid.tsx";
import type { ShopPage } from "@/lib/shop-pages.ts";

const SORTS = [
  { value: "newest", label: "Newest Items" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

// The page already decides the category, so that filter is left out
const PAGE_FILTER_GROUPS = SHOP_FILTER_GROUPS.filter((g) => g.key !== "category");

/** One shop page per listing type or menu section, e.g. /used/high-heels. */
export default function ShopCategoryPage({ page }: { page: ShopPage }) {
  const { selection, toggle, clear, active } = useFilterSelection();
  const [sort, setSort] = useState<Sort>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const args = useMemo<BrowseArgs>(() => {
    const chosen = toArgs(selection);
    const seller = [...(chosen.seller ?? []), ...(page.filter.seller ?? [])];
    return {
      ...chosen,
      ...page.filter,
      seller: seller.length ? seller : undefined,
      sort,
    };
  }, [selection, page, sort]);

  const filterPanel = (
    <FilterGroups groups={PAGE_FILTER_GROUPS} selection={selection} onToggle={toggle} defaultOpen={[]} />
  );

  return (
    <div className="flex flex-col">
      <section className="bg-black/30 px-4 py-6 text-center md:py-8">
        <h1 className="font-display text-4xl font-bold text-balance text-violet-600 sm:text-5xl md:text-6xl">
          {page.title}
        </h1>
      </section>

      <div className="mx-auto grid w-full max-w-7xl items-start gap-8 px-4 py-6 md:py-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="flex items-center justify-between pb-3 pl-4 pt-2">
            <p className="flex items-center gap-2 text-lg uppercase">
              <Funnel className="size-5 text-violet-600" /> Filter
            </p>
            {active > 0 && (
              <button type="button" onClick={clear} className="cursor-pointer text-xs font-bold text-violet-600 hover:underline">
                Clear all
              </button>
            )}
          </div>
          <div className="pl-4 pr-6 [&_[data-slot=accordion-trigger]]:font-display [&_[data-slot=accordion-trigger]]:text-lg">
            {filterPanel}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-2xl">
                Shop for <span className="text-violet-600">{page.shopFor}</span>
              </p>
              <div className="mt-1.5 h-0.5 w-16 bg-violet-600" />
            </div>
            <div className="flex items-end gap-3">
              <Button onClick={() => setFiltersOpen(true)} className="h-10 cursor-pointer lg:hidden">
                <Funnel className="size-4" /> Filter
                {active > 0 && (
                  <span className="rounded-full bg-primary-foreground px-2 text-xs font-bold text-primary">{active}</span>
                )}
              </Button>
              <label className="flex flex-col gap-1 text-sm uppercase">
                Sort by:
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="h-10 min-w-48 cursor-pointer rounded-[5px] border-2 border-violet-600 bg-transparent px-3 normal-case sm:min-w-72"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#18191d]">
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <CategoryGrid args={args} filtered={active > 0} onClear={clear} />
        </div>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="left"
          className="flex w-[88vw] max-w-sm flex-col gap-0 border-white/[3%] bg-popover p-0"
        >
          <SheetHeader className="border-b border-white/[3%]">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Funnel className="size-5 text-violet-600" /> Filter
            </SheetTitle>
            <SheetDescription>Narrow {page.shopFor.toLowerCase()} by price, listed date and seller details.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4">{filterPanel}</div>
          <SheetFooter className="flex-row gap-2 border-t border-white/[3%] pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button variant="secondary" onClick={clear} disabled={active === 0} className="flex-1 cursor-pointer">
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)} className="flex-1 cursor-pointer">
              Show results
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
