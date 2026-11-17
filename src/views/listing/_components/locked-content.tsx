import { useBackendAuth, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNow } from "date-fns";
import { CameraOff, Check, Clock, Film, Image, Lock, Unlock, VideoOff, X, Zap } from "lucide-react";
import { toast } from "sonner";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import ZoomImage from "@/components/zoom-image.tsx";
import { NURMA, SERIF } from "@/views/seller/_lib/profile-design.tsx";

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
            <video key={m.storageId} src={m.url} controls playsInline className="w-full rounded-[2px] bg-black" />
          ) : (
            <a key={m.storageId} href={m.url} target="_blank" rel="noreferrer" className="cursor-pointer">
              <img src={m.url} alt="" className="w-full rounded-[2px] object-cover" />
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
    <div className="flex flex-col gap-3 rounded-[2px] border border-primary/40 bg-accent/30 p-4">
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
          {status === "expired" && <p className="text-sm">Your 24-hour access has ended. Buy again to view it.</p>}
          <Button size="lg" onClick={buy} disabled={!isActive} className="cursor-pointer">
            <Unlock /> Buy to unlock · {formatPrice(priceCents)}
          </Button>
          <p className="text-xs text-muted-foreground">
            You pay {sellerName} directly. They unlock the full photos and videos once paid, and access lasts 24 hours.
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
    <section className="flex flex-col gap-3 rounded-[2px] border border-white/[3%] bg-card shadow-[0_14px_34px_-8px_rgba(0,0,0,0.3)] p-4">
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

/** Instant Content: the price box under the picture, with Unlock Now (the buyer's request flow). */
export function UnlockBox({
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
  const [dollars, cents] = (priceCents / 100).toFixed(2).split(".");

  const unlock = async () => {
    if (!isAuthenticated) return void signin();
    try {
      await request({ listingId });
      toast.success("Request sent. Message the seller to arrange payment.");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not send request"));
    }
  };

  return (
    <div className={cn(SERIF, "flex flex-col gap-3 rounded-[2px] border border-[#5e2faf] bg-[#202227] px-[18px] pb-4 pt-3 shadow-[0_6px_14px_rgba(0,0,0,0.35)]")}>
      <p className="text-center text-[32px] leading-none text-[#7b3aec]">
        ${dollars}.{cents}
        <span className="ml-0.5 text-[20px]">USD</span>
      </p>
      {status === "pending" ? (
        <p className="flex items-start justify-center gap-2 text-center text-[14px] text-white">
          <Clock className="mt-0.5 size-4 shrink-0 text-[#7b3aec]" />
          Waiting for {sellerName} to confirm your payment. Message them to arrange it.
        </p>
      ) : (
        <>
          {status === "declined" && <p className="text-center text-[13px] text-destructive">Your last request was declined. You can try again.</p>}
          {status === "expired" && <p className="text-center text-[13px] text-white">Your 24-hour access has ended. Unlock again to view it.</p>}
          <button
            type="button"
            onClick={unlock}
            disabled={!isActive}
            className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-[2px] bg-[#7b3aec] text-[26px] text-white transition-colors hover:bg-[#8a4ff0] disabled:cursor-default disabled:opacity-60"
          >
            <Unlock className="size-6" /> Unlock Now
          </button>
        </>
      )}
      <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[13px] text-white">
        <span className="flex items-center gap-1.5">
          <Zap className="size-[18px] text-[#7b3aec]" strokeWidth={1.5} /> Instant access
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-[18px] text-[#7b3aec]" strokeWidth={1.5} /> 24-hour access
        </span>
      </p>
    </div>
  );
}

const TILE = "flex aspect-square items-center justify-center overflow-hidden rounded-[2px] bg-[#30333e]";

/** Instant Content: shown to a buyer while their 24 hours are running. */
export function AccessNotice({ expiresAt }: { expiresAt: number | null }) {
  return (
    <p className={cn(SERIF, "flex items-center justify-center gap-2 rounded-[2px] border border-[#5e2faf] bg-[#202227] px-4 py-3 text-[15px] text-white shadow-[0_6px_14px_rgba(0,0,0,0.35)]")}>
      <Unlock className="size-5 text-[#7b3aec]" />
      {expiresAt ? `Unlocked. Your access ends in ${formatDistanceToNow(expiresAt)}.` : "Unlocked."}
    </p>
  );
}

/** Instant Content: the "Included Content" tiles. Locked items show an icon; unlocked ones the real media. */
export function IncludedContent({ locked }: { locked: Locked }) {
  const total = locked.photoCount + locked.videoCount;
  return (
    <section className="flex flex-col gap-[26px]">
      <div className="flex flex-col gap-2">
        <h2 className={cn(NURMA, "text-[28px] leading-tight text-white")}>Included Content</h2>
        <span className="h-0.5 w-[60px] bg-[#7b3aec]/55" />
      </div>
      {total === 0 ? (
        <p className={cn(SERIF, "text-[14px] text-white")}>No content has been added yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {locked.media
            ? locked.media.map((m) =>
                m.kind === "video" ? (
                  <div key={m.storageId} className={TILE}>
                    <video src={m.url} controls playsInline className="size-full object-cover" />
                  </div>
                ) : (
                  <ZoomImage key={m.storageId} src={m.url} className={cn(TILE, "w-full")}>
                    <img src={m.url} alt="" className="size-full object-cover" />
                  </ZoomImage>
                ),
              )
            : [
                ...Array.from({ length: locked.photoCount }, (_, i) => (
                  <div key={`p${i}`} className={TILE} title="Photo (locked)">
                    <CameraOff className="size-[64px] text-[#7b3aec]" strokeWidth={1.5} />
                  </div>
                )),
                ...Array.from({ length: locked.videoCount }, (_, i) => (
                  <div key={`v${i}`} className={TILE} title="Video (locked)">
                    <VideoOff className="size-[64px] text-[#7b3aec]" strokeWidth={1.5} />
                  </div>
                )),
              ]}
        </div>
      )}
    </section>
  );
}
