"use client";

import { useSearchParams } from "@/lib/navigation.ts";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { Search } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ListingGrid } from "@/components/listing-card.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import {
  CATEGORIES,
  CONDITIONS,
  type Category,
  type Condition,
} from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

function parseParam<T extends string>(
  value: string | null,
  allowed: readonly { value: T }[],
): T | undefined {
  return allowed.find((a) => a.value === value)?.value;
}

export default function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const category = parseParam<Category>(params.get("category"), CATEGORIES);
  const condition = parseParam<Condition>(params.get("condition"), CONDITIONS);
  const sort = parseParam<Sort>(params.get("sort"), SORTS) ?? "newest";
  const searchInput = params.get("q") ?? "";
  const [search] = useDebounce(searchInput, 300);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const query = usePaginatedQuery(
    api.listings.browse,
    {
      search: search.trim() || undefined,
      category,
      condition,
      sort,
    },
    { initialNumItems: 24 },
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-5xl md:text-7xl">
        {category ? CATEGORIES.find((c) => c.value === category)?.label : "Shop all"}
      </h1>

      <div className="flex flex-col gap-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="Search lace, cotton, gym socks..."
              className="h-10 pl-9"
            />
          </div>
          <div className="flex gap-3">
            <Select
              value={condition ?? "all"}
              onValueChange={(v) => setParam("condition", v === "all" ? undefined : v)}
            >
              <SelectTrigger className="h-10! w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any wear time</SelectItem>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(v) => setParam("sort", v === "newest" ? undefined : v)}
              disabled={!!search.trim()}
            >
              <SelectTrigger className="h-10! w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[{ value: undefined, label: "All" }, ...CATEGORIES].map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setParam("category", c.value)}
              className={cn(
                "cursor-pointer rounded-sm border px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors",
                category === c.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-secondary",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <ListingGrid
        query={query}
        emptyTitle="Nothing here yet"
        emptyDescription="Try a different search or filter."
      />
    </div>
  );
}
