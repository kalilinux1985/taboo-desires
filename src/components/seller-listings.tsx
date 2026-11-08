import Link from "next/link";
import { usePaginatedQuery } from "@/lib/backend/react.tsx";
import { Plus } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { ListingGrid } from "@/components/listing-card.tsx";

export type ListingKind = "items" | "instant";

/** A seller's listings that are for sale. */
export default function SellerListings({
  sellerId,
  isMe,
  kind,
}: {
  sellerId: Id<"users">;
  isMe: boolean;
  kind?: ListingKind;
}) {
  const query = usePaginatedQuery(
    api.listings.bySeller,
    { sellerId, status: "active", kind },
    { initialNumItems: 24 },
  );
  return (
    <div className="flex flex-col gap-6">
      <ListingGrid
        query={query}
        emptyTitle="Nothing for sale"
        emptyDescription={isMe ? "List your first item and keep 100% of the sale." : "Check back soon."}
        emptyAction={
          isMe ? (
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
