import { useState } from "react";
import Link from "next/link";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { Plus } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import type { Doc, Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ListingGrid } from "@/components/listing-card.tsx";

export type ListingKind = "items" | "instant";

/**
 * A seller's listings grouped by status. Owners also see unsold auctions.
 * Instant content has no status tabs and only shows what is for sale.
 */
export default function SellerListings({
  sellerId,
  isMe,
  kind,
}: {
  sellerId: Id<"users">;
  isMe: boolean;
  kind?: ListingKind;
}) {
  const [status, setStatus] = useState<Doc<"listings">["status"]>("active");
  const showStatusTabs = kind !== "instant";
  const query = usePaginatedQuery(
    api.listings.bySeller,
    { sellerId, status, kind },
    { initialNumItems: 24 },
  );
  return (
    <div className="flex flex-col gap-6">
      {showStatusTabs && (
        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v === "sold" || v === "ended" ? v : "active")}
        >
          <TabsList>
            <TabsTrigger value="active" className="cursor-pointer">For sale</TabsTrigger>
            <TabsTrigger value="sold" className="cursor-pointer">Sold</TabsTrigger>
            {isMe && (
              <TabsTrigger value="ended" className="cursor-pointer">Unsold</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}
      <ListingGrid
        query={query}
        emptyTitle={
          status === "active" ? "Nothing for sale" : status === "sold" ? "No sales yet" : "Nothing unsold"
        }
        emptyDescription={
          isMe && status === "active"
            ? "List your first item and keep 100% of the sale."
            : "Check back soon."
        }
        emptyAction={
          isMe && status === "active" ? (
            <Button asChild size="sm" className="cursor-pointer">
              <Link href="/sell">
                <Plus /> List an item
              </Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
