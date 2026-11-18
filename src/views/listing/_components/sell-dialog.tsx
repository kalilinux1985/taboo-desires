"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@/lib/navigation.ts";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";

/**
 * "Mark as sold": pick the buyer (from people who messaged you) to open an
 * order with shipping, or mark it sold without one if it sold elsewhere.
 */
export default function SellDialog({ listingId }: { listingId: Id<"listings"> }) {
  const [open, setOpen] = useState(false);
  const [buyerId, setBuyerId] = useState<Id<"users"> | null>(null);
  const [busy, setBusy] = useState(false);
  const choices = useQuery(api.orders.buyerChoices, open ? { listingId } : "skip");
  const sell = useMutation(api.orders.sellListing);
  const navigate = useNavigate();

  const submit = async (withBuyer: boolean) => {
    setBusy(true);
    try {
      const orderId = await sell({ listingId, buyerId: withBuyer && buyerId ? buyerId : undefined });
      setOpen(false);
      if (orderId) {
        toast.success("Sold! The order is in Orders, ready for a shipping label.");
        navigate("/orders");
      } else {
        toast.success("Marked as sold");
      }
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't mark it as sold"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="cursor-pointer">
          <CheckCircle2 /> Mark as sold
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Who bought it?</DialogTitle>
          <DialogDescription>
            Pick the buyer to create an order. They'll add their address, and you can print a prepaid shipping label
            from Orders.
          </DialogDescription>
        </DialogHeader>
        {choices === undefined ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : choices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No buyers have messaged you yet. If it sold somewhere else, mark it sold without an order.
          </p>
        ) : (
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto" role="radiogroup" aria-label="Buyer">
            {choices.map((c) => (
              <button
                key={c._id}
                type="button"
                role="radio"
                aria-checked={c._id === buyerId}
                onClick={() => setBuyerId(c._id)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[2px] border px-3 py-2 text-left text-sm transition-colors",
                  c._id === buyerId ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent",
                )}
              >
                <ProfileAvatar name={c.name} url={c.avatarUrl} className="size-8 text-sm" />
                <span className="flex-1 truncate font-semibold">{c.name}</span>
                {c.askedAboutIt && <span className="text-xs text-muted-foreground">asked about this</span>}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button className="cursor-pointer" disabled={!buyerId || busy} onClick={() => submit(true)}>
            {busy && <Spinner />} Sell to this buyer
          </Button>
          <Button variant="ghost" className="cursor-pointer" disabled={busy} onClick={() => submit(false)}>
            Sold elsewhere (no order)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
