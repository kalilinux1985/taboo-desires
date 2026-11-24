"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { CircleCheck, ExternalLink, MapPin, RefreshCw, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import {
  ORDER_STATUS_LABEL,
  TRACKING_STATUS_LABEL,
  type OrderStatus,
} from "@/shared/shipping.ts";
import AddressForm from "./address-form.tsx";
import LabelDialog, { PrintLabelLink } from "./label-dialog.tsx";
import TrackingDialog from "./tracking-dialog.tsx";
import { ContractTerms } from "@/views/messages/_components/contract.tsx";

export type OrderRow = FunctionReturnType<typeof api.orders.list>["page"][number];

const STATUS_STYLE: Record<OrderStatus, string> = {
  awaiting_address: "bg-amber-500 text-white",
  ready_to_ship: "bg-primary text-primary-foreground",
  label_created: "bg-primary text-primary-foreground",
  shipped: "bg-sky-600 text-white",
  delivered: "bg-emerald-600 text-white",
  cancelled: "bg-secondary text-muted-foreground",
};

function nextStep(o: OrderRow): string | null {
  const seller = o.role === "seller";
  switch (o.status) {
    case "awaiting_address":
      return seller ? "Waiting for the buyer to add their shipping address." : "Add your shipping address so the seller can ship.";
    case "ready_to_ship":
      return seller ? "Create a prepaid label, or enter tracking if you shipped it yourself." : "The seller is getting your order ready.";
    case "label_created":
      return seller ? "Print the label, attach it, and drop the package off." : "The seller has made the label. Tracking starts once it's scanned.";
    case "shipped":
      return seller ? "On its way." : "On its way to you.";
    default:
      return null;
  }
}

function useRun() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    try {
      await fn();
      if (success) toast.success(success);
    } catch (e) {
      toast.error(getErrorMessage(e, "Something went wrong"));
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

function AddressDialog({ order }: { order: OrderRow }) {
  const [open, setOpen] = useState(false);
  const setShipTo = useMutation(api.orders.setShipTo);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={order.shipTo ? "secondary" : "default"} className="cursor-pointer">
          <MapPin /> {order.shipTo ? "Change address" : "Add shipping address"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Where should it ship?</DialogTitle>
          <DialogDescription>
            The seller sees only your city and state here, but your name and address are printed on the shipping
            label. Use a PO box if you'd rather keep your home address private.
          </DialogDescription>
        </DialogHeader>
        <AddressForm
          initial={order.shipTo}
          submitLabel="Save address"
          saveLabel="Use this address for future orders"
          onSubmit={async (address, save) => {
            await setShipTo({ orderId: order._id, address, saveAsDefault: save });
            toast.success("Address saved");
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default function OrderCard({ order: o }: { order: OrderRow }) {
  const { busy, run } = useRun();
  const cancel = useMutation(api.orders.cancel);
  const voidLabel = useMutation(api.shipping.voidLabel);
  const refresh = useMutation(api.shipping.refreshTracking);
  const confirmReceived = useMutation(api.orders.confirmReceived);
  const seller = o.role === "seller";
  const step = nextStep(o);
  // Shipped items can't be cancelled once on their way; Instant Content never can
  const notShipped = o.status === "awaiting_address" || o.status === "ready_to_ship";
  const canCancel = !o.isInstant && notShipped;

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start gap-4">
        {o.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={o.imageUrl} alt="" className="size-16 shrink-0 rounded-[5px] object-cover" />
        ) : (
          <div className="size-16 shrink-0 rounded-[5px] bg-secondary" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            {o.listingId ? (
              <Link href={`/listing/${o.listingId}`} className="truncate font-semibold hover:underline">
                {o.title}
              </Link>
            ) : (
              <span className="truncate font-semibold">{o.title}</span>
            )}
            <Badge className={cn("shrink-0", STATUS_STYLE[o.status])}>{ORDER_STATUS_LABEL[o.status]}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ProfileAvatar name={o.other?.name ?? "?"} url={o.other?.avatarUrl ?? null} className="size-5 text-[10px]" />
            <span className="truncate">
              {seller ? "Buyer" : "Seller"}:{" "}
              {o.other && !seller ? (
                <Link href={`/seller/${o.other._id}`} className="hover:underline">
                  {o.other.name}
                </Link>
              ) : (
                (o.other?.name ?? "Deleted user")
              )}
            </span>
            <span>· {formatDistanceToNowStrict(o.createdAt, { addSuffix: true })}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {seller && o.shipsTo && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ships to</p>
            <p className="font-semibold">{o.shipsTo}</p>
          </div>
        )}
        {!seller && o.shipTo && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Shipping to</p>
            <p className="font-semibold">{o.shipTo.name}</p>
            <p className="text-muted-foreground">
              {o.shipTo.street1}
              {o.shipTo.street2 ? `, ${o.shipTo.street2}` : ""}, {o.shipTo.city}, {o.shipTo.state} {o.shipTo.zip}
            </p>
          </div>
        )}
        {o.trackingCode && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Tracking{o.carrier ? ` · ${o.carrier}` : ""}
            </p>
            {o.trackingUrl ? (
              <a
                href={o.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono font-semibold hover:underline"
              >
                {o.trackingCode} <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <p className="font-mono font-semibold">{o.trackingCode}</p>
            )}
            {o.trackingStatus && (
              <p className="text-muted-foreground">{TRACKING_STATUS_LABEL[o.trackingStatus] ?? o.trackingStatus}</p>
            )}
          </div>
        )}
        {seller && o.postageCents !== null && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Postage</p>
            <p className="font-semibold">
              {formatPrice(o.postageCents)}
              {o.service ? <span className="font-normal text-muted-foreground"> · {o.service}</span> : null}
            </p>
          </div>
        )}
      </div>

      {o.coinAmount && (
        <p className="text-sm text-white">
          Paid with <span className="font-semibold text-[#7c3aed]">{o.coinAmount.toLocaleString("en-US")} Taboo Coins</span>
        </p>
      )}
      {o.contract && (
        <details open={seller} className="rounded-[5px] border border-violet-600/40 bg-[#141519] px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold text-white">
            Contract · {formatPrice(o.contract.totalCents)} in {o.contract.paymentCount} {o.contract.paymentCount === 1 ? "payment" : "payments"}
          </summary>
          <div className="mt-2">
            <ContractTerms c={o.contract} />
            <Link href={`/messages/${o.contract.conversationId}`} className="mt-2 inline-block text-sm text-violet-600 hover:underline">
              Open the conversation
            </Link>
          </div>
        </details>
      )}

      {step && <p className="text-sm text-muted-foreground">{step}</p>}

      <div className="flex flex-wrap gap-2">
        {!seller && notShipped && !o.isInstant && <AddressDialog order={o} />}
        {seller && o.status === "ready_to_ship" && <LabelDialog orderId={o._id} shipsTo={o.shipsTo} />}
        {seller && notShipped && !o.isInstant && <TrackingDialog orderId={o._id} />}
        {seller && o.status === "shipped" && !o.hasLabel && (
          <TrackingDialog orderId={o._id} current={{ carrier: o.carrier, code: o.trackingCode }} />
        )}
        {seller && o.status === "label_created" && o.labelUrl && <PrintLabelLink url={o.labelUrl} />}
        {o.hasLabel && (o.status === "label_created" || o.status === "shipped") && (
          <Button
            size="sm"
            variant="secondary"
            className="cursor-pointer"
            disabled={busy !== null}
            onClick={() => run("refresh", () => refresh({ orderId: o._id }), "Tracking updated")}
          >
            {busy === "refresh" ? <Spinner /> : <RefreshCw />} Refresh tracking
          </Button>
        )}
        {!seller && (o.status === "shipped" || o.status === "label_created") && (
          <Button
            size="sm"
            variant="secondary"
            className="cursor-pointer"
            disabled={busy !== null}
            onClick={() => run("received", () => confirmReceived({ orderId: o._id }), "Marked as received")}
          >
            {busy === "received" ? <Spinner /> : <CircleCheck />} I got it
          </Button>
        )}
        {seller && o.status === "label_created" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="cursor-pointer" disabled={busy !== null}>
                {busy === "void" ? <Spinner /> : <Undo2 />} Void label
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Void this label?</AlertDialogTitle>
                <AlertDialogDescription>
                  Only void a label you haven't used. The postage is refunded by the carrier (USPS can take a few
                  weeks), and you can make a new label afterwards.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">Keep it</AlertDialogCancel>
                <AlertDialogAction
                  className="cursor-pointer"
                  onClick={() => run("void", () => voidLabel({ orderId: o._id }), "Label voided")}
                >
                  Void label
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="cursor-pointer text-destructive hover:text-destructive" disabled={busy !== null}>
                {busy === "cancel" ? <Spinner /> : <X />} Cancel order
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  Nothing will be shipped. Sort out any payment with the {seller ? "buyer" : "seller"} in Messages.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">Keep order</AlertDialogCancel>
                <AlertDialogAction
                  className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => run("cancel", () => cancel({ orderId: o._id }), "Order cancelled")}
                >
                  Cancel order
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );
}
