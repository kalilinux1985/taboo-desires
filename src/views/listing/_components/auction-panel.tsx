import { useState } from "react";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNow } from "date-fns";
import { Crown, Gavel, Timer, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Authenticated, Unauthenticated } from "@/lib/backend/react.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import Countdown from "@/components/countdown.tsx";
import UpgradeNotice from "@/components/upgrade-notice.tsx";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";

type Auction = NonNullable<FunctionReturnType<typeof api.auctions.forListing>>;

function BidForm({ auction }: { auction: Auction }) {
  const placeBid = useMutation(api.auctions.placeBid);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const minDollars = auction.minNextBidCents / 100;
  const quickBids = [0, 1, 3].map(
    (n) => auction.minNextBidCents + n * auction.incrementCents,
  );

  const submit = async (cents: number) => {
    setBusy(true);
    try {
      const { extended } = await placeBid({ auctionId: auction._id, amountCents: cents });
      toast.success(`Bid placed: ${formatPrice(cents)}`, {
        description: extended ? "Late bid, so the auction got 2 more minutes." : undefined,
      });
      setAmount("");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not place bid"));
    } finally {
      setBusy(false);
    }
  };

  const typed = Math.round(Number(amount) * 100);
  const typedValid = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && typed >= auction.minNextBidCents;

  if (auction.iAmHighBidder) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-accent p-4 text-accent-foreground">
        <Crown className="size-5 shrink-0" />
        <div>
          <p className="font-display text-xl leading-tight">You're winning</p>
          <p className="text-sm">You have the top bid. This updates live if someone outbids you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {quickBids.map((cents) => (
          <Button
            key={cents}
            variant="secondary"
            disabled={busy}
            onClick={() => submit(cents)}
            className="cursor-pointer font-mono"
          >
            {formatPrice(cents)}
          </Button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (typedValid) submit(typed);
        }}
      >
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`${minDollars} or more`}
            className="h-10 pl-7 font-mono"
            aria-label="Your bid"
          />
        </div>
        <Button type="submit" size="lg" disabled={busy || !typedValid} className="cursor-pointer">
          {busy ? <Spinner /> : <Gavel />} Place bid
        </Button>
      </form>
    </div>
  );
}

function BidHistory({ bids }: { bids: Auction["bids"] }) {
  if (bids.length === 0) {
    return <p className="text-sm text-muted-foreground">No bids yet. Be the first.</p>;
  }
  return (
    <ol className="flex flex-col divide-y">
      <AnimatePresence initial={false}>
        {bids.map((b, i) => (
          <motion.li
            key={b._id}
            layout
            initial={{ opacity: 0, y: -8, backgroundColor: "var(--accent)" }}
            animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-center justify-between gap-3 px-1 py-2 text-sm"
          >
            <span className={cn("truncate", i === 0 && "font-semibold")}>
              {b.isMe ? "You" : b.bidderLabel}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(b._creationTime, { addSuffix: true })}
              </span>
              <span className={cn("font-mono", i === 0 && "font-bold")}>
                {formatPrice(b.amountCents)}
              </span>
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

function EndedBanner({ auction }: { auction: Auction }) {
  if (auction.iWon) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-accent p-4 text-accent-foreground">
        <Trophy className="size-5 shrink-0" />
        <div>
          <p className="font-display text-xl leading-tight">You won this auction</p>
          <p className="text-sm">Message the seller to arrange payment and shipping.</p>
        </div>
      </div>
    );
  }
  return (
    <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
      {auction.bidCount > 0
        ? `Auction ended. Sold for ${formatPrice(auction.currentBidCents)}.`
        : "Auction ended with no bids."}
    </p>
  );
}

/** Live auction panel: current bid, countdown, bid form, and history. */
export default function AuctionPanel({
  listingId,
  isOwner,
  buyBlocked,
}: {
  listingId: Id<"listings">;
  isOwner: boolean;
  /** Why the signed-in user can't bid (seller accounts), or null */
  buyBlocked: string | null;
}) {
  const auction = useQuery(api.auctions.forListing, { listingId });

  if (auction === undefined) return <Skeleton className="h-64 w-full" />;
  if (auction === null) return null;

  const live = auction.status === "live";

  return (
    <div className="flex flex-col gap-4 rounded-[3px] border-2 border-primary bg-card p-4 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {auction.bidCount === 0 ? "Starting bid" : live ? "Current bid" : "Winning bid"}
          </p>
          <motion.p
            key={auction.currentBidCents}
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="origin-left font-mono text-4xl font-bold"
          >
            {formatPrice(auction.currentBidCents)}
          </motion.p>
          <p className="text-xs text-muted-foreground">
            {auction.bidCount} {auction.bidCount === 1 ? "bid" : "bids"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Timer className="size-3.5" /> {live ? "Ends in" : "Ended"}
          </p>
          {live ? (
            <Countdown endsAt={auction.endsAt} className="text-2xl font-bold" />
          ) : (
            <p className="text-sm">{new Date(auction.endsAt).toLocaleString()}</p>
          )}
        </div>
      </div>

      {live && !isOwner && buyBlocked && <UpgradeNotice message={buyBlocked} showUpgrade={false} />}
      {live && !isOwner && !buyBlocked && (
        <>
          <Authenticated>
            <BidForm auction={auction} />
          </Authenticated>
          <Unauthenticated>
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
              <p className="text-sm">Sign in to place a bid.</p>
              <SignInButton size="sm" />
            </div>
          </Unauthenticated>
        </>
      )}
      {live && isOwner && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          This is your auction. It closes automatically and the highest bid wins.
        </p>
      )}
      {!live && <EndedBanner auction={auction} />}

      <div className="flex flex-col gap-2 border-t pt-3">
        <h3 className="font-display text-lg">Bid history</h3>
        <BidHistory bids={auction.bids} />
      </div>
    </div>
  );
}
