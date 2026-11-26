"use client";

import CoinIcon from "@/components/coin-icon.tsx";
import { useState } from "react";
import Link from "next/link";
import { CreditCard, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useBackendAuth, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { useAuth } from "@/components/providers/auth.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { coinsFor, formatCoins } from "@/shared/coins.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";

/** Payment options on a listing: Taboo Coins first (recommended), then the others (coming soon). */
export function CoinPay({
  listingId,
  priceCents,
  title,
  instant = false,
  disabled = false,
}: {
  listingId: Id<"listings">;
  priceCents: number;
  title: string;
  /** Instant Content: paying unlocks it straight away */
  instant?: boolean;
  disabled?: boolean;
}) {
  const { isAuthenticated } = useBackendAuth();
  const { signin } = useAuth();
  const me = useQuery(api.users.menu, isAuthenticated ? {} : "skip");
  const payListing = useMutation(api.coins.payListing);
  const payUnlock = useMutation(api.coins.payUnlock);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const cost = coinsFor(priceCents);
  const balance = me?.coinBalance ?? 0;
  const short = isAuthenticated && balance < cost;

  const pay = async () => {
    setBusy(true);
    try {
      if (instant) await payUnlock({ listingId });
      else await payListing({ listingId });
      toast.success(instant ? "Unlocked! Enjoy." : "Paid with Taboo Coins. Your order is in Orders.");
    } catch (e) {
      toast.error(getErrorMessage(e, "Payment didn't go through"));
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-[5px] border border-[#7c3aed] bg-[#7c3aed]/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-white">
            <CoinIcon className="size-5" /> Taboo Coins
          </span>
          <span className="flex items-center gap-1 rounded-[5px] bg-[#7c3aed] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <Sparkles className="size-3" /> Best way to pay
          </span>
        </div>
        <p className="mt-1 text-[13px] text-white">
          {formatCoins(cost)}
          {isAuthenticated && <span className="text-white/70"> · you have {formatCoins(balance)}</span>}
        </p>
        <p className="mt-0.5 text-[12px] text-white/70">Instant and private. 1 coin = $0.10.</p>
        <Button
          type="button"
          disabled={disabled || busy}
          onClick={() => (!isAuthenticated ? signin() : short ? undefined : setConfirm(true))}
          asChild={short}
          className="mt-2.5 h-10 w-full cursor-pointer rounded-[5px] bg-[#7c3aed] text-white hover:bg-[#7c3aed]/85"
        >
          {short ? <Link href="/coins">Get {formatCoins(cost - balance)} more</Link> : <span>{instant ? "Unlock" : "Pay"} with {formatCoins(cost)}</span>}
        </Button>
      </div>
      <div className="flex flex-col gap-1 text-[12px] text-white/70">
        <span className="flex items-center gap-2">
          <CreditCard className="size-3.5" /> Card · coming soon
        </span>
        <span className="flex items-center gap-2">
          <Wallet className="size-3.5" /> Other payment apps · coming soon
        </span>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pay {formatCoins(cost)}?</AlertDialogTitle>
            <AlertDialogDescription>
              {instant ? `Unlock "${title}". You'll see it right away, for 24 hours.` : `Buy "${title}". An order is created and the seller is told to ship it.`}{" "}
              You'll have {formatCoins(balance - cost)} left.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={pay} disabled={busy} className={cn("cursor-pointer bg-[#7c3aed] text-white hover:bg-[#7c3aed]/85")}>
              Pay {formatCoins(cost)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
