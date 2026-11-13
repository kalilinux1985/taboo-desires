"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
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
import { ShopGrid, type BrowseArgs } from "@/components/shop/shop-grid.tsx";
import type { ShopPage } from "@/lib/shop-pages.ts";

const SORTS = [
  { value: "newest", label: "Newest first" },
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

  return (
    <div className="flex flex-col">
      <section className="bg-primary px-4 py-8 text-center md:py-12">
        <h1 className="font-display text-4xl font-bold text-balance text-primary-foreground sm:text-5xl md:text-6xl">
          {page.title}
        </h1>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:py-8">
        <p className="text-2xl font-extrabold">
          Shop for <span className="text-violet-600">{page.shopFor}</span>
        </p>

        <div className="flex gap-3">
          <Button
            onClick={() => setFiltersOpen(true)}
            className="h-12 flex-1 cursor-pointer rounded-[1px] text-base font-bold"
          >
            <SlidersHorizontal className="size-5" /> Filter
            {active > 0 && (
              <span className="rounded-full bg-primary-foreground px-2 text-xs font-bold text-primary">
                {active}
              </span>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                aria-label="Sort"
                className="h-12 w-16 cursor-pointer rounded-[1px] border-b-4 border-white/25"
              >
                <ArrowUpDown className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {SORTS.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onSelect={() => setSort(s.value)}
                  className="cursor-pointer"
                >
                  <Check className={sort === s.value ? "opacity-100" : "opacity-0"} />
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ShopGrid
          args={args}
          filtered={active > 0}
          onClear={clear}
          className="sm:grid-cols-2 lg:grid-cols-3"
        />
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="left"
          className="flex w-[88vw] max-w-sm flex-col gap-0 border-white/25 bg-popover p-0"
        >
          <SheetHeader className="border-b border-white/25">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <SlidersHorizontal className="size-5 text-violet-600" /> Filter
            </SheetTitle>
            <SheetDescription>Narrow {page.shopFor.toLowerCase()} by price, wear time and seller.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4">
            <FilterGroups
              groups={PAGE_FILTER_GROUPS}
              selection={selection}
              onToggle={toggle}
              defaultOpen={["saleType", "price", "condition"]}
            />
          </div>
          <SheetFooter className="flex-row gap-2 border-t border-white/25 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="secondary"
              onClick={clear}
              disabled={active === 0}
              className="flex-1 cursor-pointer"
            >
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
