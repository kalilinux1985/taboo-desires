import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import RequireAuth from "@/components/require-auth.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import ListingForm, { type ListingSubmit } from "../../sell/_components/listing-form.tsx";

function EditForm({ listingId }: { listingId: Id<"listings"> }) {
  const navigate = useNavigate();
  const listing = useQuery(api.listings.get, { listingId });
  const update = useMutation(api.listings.update);

  if (listing === undefined) return <Skeleton className="h-96 w-full" />;
  if (listing === null || !listing.isOwner) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>You can't edit this listing</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm" className="cursor-pointer">
            <Link to="/shop">Back to my shop</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  // Sale type and length are fixed after publishing, so they aren't sent
  const onSubmit = async ({ saleType: _s, durationHours: _d, ...values }: ListingSubmit) => {
    try {
      await update({ listingId, ...values });
      toast.success("Listing updated");
      navigate(`/listing/${listingId}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not update listing"));
    }
  };

  return (
    <ListingForm
      submitLabel="Save changes"
      onSubmit={onSubmit}
      isEdit
      priceLocked={listing.auctionHasBids}
      defaultPhotos={listing.images}
      defaultLocked={listing.locked?.media ?? undefined}
      defaultValues={{
        saleType: listing.saleType ?? "fixed",
        title: listing.title,
        brand: listing.brand,
        size: listing.size,
        category: listing.category,
        condition: listing.condition,
        price: String(listing.priceCents / 100),
        description: listing.description,
      }}
    />
  );
}

export default function EditListingPage() {
  const { listingId } = useParams<{ listingId: Id<"listings"> }>();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="pb-8 font-display text-5xl">Edit listing</h1>
      <RequireAuth>{listingId && <EditForm listingId={listingId} />}</RequireAuth>
    </div>
  );
}
