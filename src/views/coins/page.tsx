"use client";

import CoinIcon from "@/components/coin-icon.tsx";
import { format } from "date-fns";
import { toast } from "sonner";
import { useBackendAuth, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { useAuth } from "@/components/providers/auth.tsx";
import { COIN_PACKS, COIN_VALUE_CENTS, formatCoins } from "@/shared/coins.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

const KIND: Record<string, string> = {
  pack: "Bought coins",
  grant: "Added by Taboo Desires",
  purchase: "Bought",
  sale: "Sold",
  unlock: "Unlocked",
  unlock_sale: "Unlocked by a buyer",
  refund: "Refund",
  refund_sale: "Refunded to buyer",
};

/** Taboo Coins: balance, coin packs and history. */
export default function CoinsPage() {
  const { isAuthenticated } = useBackendAuth();
  const { signin } = useAuth();
  const data = useQuery(api.coins.mine, isAuthenticated ? {} : "skip");

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#0C0F15] text-white">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-8 px-5 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="flex items-center gap-3 font-display text-4xl">
            <CoinIcon className="size-9" /> Taboo Coins
          </h1>
          <p className="max-w-2xl text-white/80">
            The fastest and most private way to pay on Taboo Desires. 1 coin = $0.10, so a $50 item costs 500 coins.
          </p>
        </header>

        {isAuthenticated && (
          <Card data-slot="card" className="flex-row items-center justify-between gap-4 rounded-[5px] border-[#59595b40] bg-[#202227] p-6">
            <div>
              <p className="text-sm text-white/70">Your balance</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-bold tabular-nums">
                <CoinIcon className="size-7" />
                {data === undefined ? <Skeleton className="h-8 w-24" /> : (data?.balance ?? 0).toLocaleString("en-US")}
              </p>
            </div>
            <p className="text-right text-sm text-white/70">
              Worth ${(((data?.balance ?? 0) * COIN_VALUE_CENTS) / 100).toFixed(2)} on the site
            </p>
          </Card>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl">Coin packs</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.packs ?? COIN_PACKS).map((p) => (
              <Card
                key={p.coins}
                data-slot="card"
                className="relative gap-3 rounded-[5px] border-[#59595b40] bg-[#202227] p-5"
              >
                <p className="flex items-center gap-2 text-2xl font-bold">
                  <CoinIcon className="size-6" /> {p.coins.toLocaleString("en-US")}
                </p>
                <p className="text-sm text-white/70">Spends like ${((p.coins * COIN_VALUE_CENTS) / 100).toFixed(2)}</p>
                <Button
                  type="button"
                  onClick={() => (isAuthenticated ? toast("Buying coins is coming soon") : signin())}
                  className="mt-1 h-10 cursor-pointer rounded-[5px] bg-[#7c3aed] text-white hover:bg-[#7c3aed]/85"
                >
                  Buy for ${(p.priceCents / 100).toFixed(2)}
                </Button>
              </Card>
            ))}
          </div>
          <p className="text-xs text-white/60">Buying coin packs opens soon. Coins don't expire.</p>
        </section>

        {isAuthenticated && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl">History</h2>
            {data === undefined ? (
              <Skeleton className="h-24 w-full" />
            ) : !data || data.history.length === 0 ? (
              <p className="text-sm text-white/70">No coin activity yet.</p>
            ) : (
              <Card data-slot="card" className="gap-0 overflow-hidden rounded-[5px] border-[#59595b40] bg-[#202227] p-0">
                {data.history.map((h) => (
                  <div key={h._id} className="flex items-center justify-between gap-4 border-b border-[#59595b40] px-4 py-3 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {KIND[h.kind] ?? h.kind}
                        {h.listingTitle && <span className="text-white/70"> · {h.listingTitle}</span>}
                        {h.note && <span className="text-white/70"> · {h.note}</span>}
                      </p>
                      <p className="text-xs text-white/60">{format(h._creationTime, "MMM d, yyyy h:mm a")}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("text-sm font-semibold tabular-nums", h.delta > 0 ? "text-green-500" : "text-white")}>
                        {h.delta > 0 ? "+" : ""}
                        {h.delta.toLocaleString("en-US")}
                      </p>
                      <p className="text-xs text-white/60 tabular-nums">{formatCoins(h.balanceAfter)}</p>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
