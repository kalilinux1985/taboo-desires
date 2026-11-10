import { useBackendAuth, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNow } from "date-fns";
import { Check, Clock, Film, Image, Lock, Unlock, X } from "lucide-react";
import { toast } from "sonner";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";

type Locked = NonNullable<NonNullable<FunctionReturnType<typeof api.listings.get>>["locked"]>;

function Counts({ locked }: { locked: Locked }) {
  return (
    <span className="flex items-center gap-3 text-sm text-muted-foreground">
      {locked.photoCount > 0 && (
        <span className="flex items-center gap-1">
          <Image className="size-4" /> {locked.photoCount} {locked.photoCount === 1 ? "photo" : "photos"}
        </span>
      )}
      {locked.videoCount > 0 && (
        <span className="flex items-center gap-1">
          <Film className="size-4" /> {locked.videoCount} {locked.videoCount === 1 ? "video" : "videos"}
        </span>
      )}
    </span>
  );
}

/** Full-resolution content for the seller and buyers with granted access. */
export function UnlockedMedia({ media }: { media: NonNullable<Locked["media"]> }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <Unlock className="size-5 text-violet-600" /> Unlocked content
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {media.map((m) =>
          m.kind === "video" ? (
            <video key={m.storageId} src={m.url} controls playsInline className="w-full rounded-md bg-black" />
          ) : (
            <a key={m.storageId} href={m.url} target="_blank" rel="noreferrer" className="cursor-pointer">
              <img src={m.url} alt="" className="w-full rounded-md object-cover" />
            </a>
          ),
        )}
      </div>
    </section>
  );
}

/** Buyer side: request to purchase, then wait for the seller to confirm payment. */
export function BuyLockedPanel({
  listingId,
  locked,
  priceCents,
  sellerName,
  isActive,
}: {
  listingId: Id<"listings">;
  locked: Locked;
  priceCents: number;
  sellerName: string;
  isActive: boolean;
}) {
  const { isAuthenticated } = useBackendAuth();
  const { signin } = useAuth();
  const request = useMutation(api.unlocks.request);
  const status = locked.unlockStatus;

  if (locked.media) return null;

  const buy = async () => {
    if (!isAuthenticated) return void signin();
    try {
      await request({ listingId });
      toast.success("Request sent. Message the seller to arrange payment.");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not send request"));
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-primary/40 bg-accent/30 p-4">
      <div className="flex items-center gap-2 font-semibold">
        <Lock className="size-4 text-violet-600" /> Locked content
      </div>
      <Counts locked={locked} />
      {status === "pending" ? (
        <p className="flex items-start gap-2 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-violet-600" />
          Waiting for {sellerName} to confirm your payment. Message them to arrange it. The content
          unlocks here as soon as they approve.
        </p>
      ) : (
        <>
          {status === "declined" && (
            <p className="text-sm text-destructive">Your last request was declined. You can try again.</p>
          )}
          <Button size="lg" onClick={buy} disabled={!isActive} className="cursor-pointer">
            <Unlock /> Buy to unlock · {formatPrice(priceCents)}
          </Button>
          <p className="text-xs text-muted-foreground">
            You pay {sellerName} directly. They unlock the full photos and videos once paid.
          </p>
        </>
      )}
    </div>
  );
}

/** Seller side: approve or decline purchase requests. */
export function UnlockRequests({ listingId }: { listingId: Id<"listings"> }) {
  const requests = useQuery(api.unlocks.pendingForListing, { listingId });
  const respond = useMutation(api.unlocks.respond);

  const answer = async (unlockId: Id<"unlocks">, grant: boolean) => {
    try {
      await respond({ unlockId, grant });
      toast.success(grant ? "Access granted" : "Request declined");
    } catch (e) {
      toast.error(getErrorMessage(e, "Something went wrong"));
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-md border border-[#383b3d]/90 bg-card shadow-[inset_4px_4px_14px_-4px_var(--color-violet-800)] p-4">
      <h2 className="font-semibold">Purchase requests</h2>
      {requests === undefined ? (
        <Skeleton className="h-12 w-full" />
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pending requests. Approve a buyer here once they have paid you.
        </p>
      ) : (
        <ul className="flex flex-col divide-y">
          {requests.map((r) => (
            <li key={r._id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.buyerName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.requestedAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => answer(r._id, true)} className="cursor-pointer">
                  <Check /> Paid, unlock
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => answer(r._id, false)}
                  className="cursor-pointer text-muted-foreground"
                >
                  <X /> Decline
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
