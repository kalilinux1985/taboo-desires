"use client";

import { useState } from "react";
import { Printer, Truck } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType, Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { PACKAGE_PRESETS } from "@/shared/shipping.ts";
import AddressForm from "./address-form.tsx";

type Rate = FunctionReturnType<typeof api.shipping.getRates>["rates"][number];

/**
 * The label PDF opens in a new tab, where the phone or computer prints it
 * (iPhone: Share → Print). A plain link, so Safari never blocks it as a pop-up.
 */
export function PrintLabelLink({ url, className }: { url: string; className?: string }) {
  return (
    <Button asChild size="sm" className={cn("cursor-pointer", className)}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Printer /> Print label
      </a>
    </Button>
  );
}

/**
 * Seller's label flow: return address (first time only) → package and weight
 * → pick a price → buy → print.
 */
export default function LabelDialog({ orderId, shipsTo }: { orderId: Id<"orders">; shipsTo: string | null }) {
  const [open, setOpen] = useState(false);
  const addresses = useQuery(api.orders.myAddresses, open ? {} : "skip");
  const mode = useQuery(api.shipping.mode, open ? {} : "skip");
  const saveAddress = useMutation(api.orders.saveAddress);
  const getRates = useMutation(api.shipping.getRates);
  const buyLabel = useMutation(api.shipping.buyLabel);

  const [editingFrom, setEditingFrom] = useState(false);
  const [presetId, setPresetId] = useState(PACKAGE_PRESETS[0].id);
  const [weight, setWeight] = useState("4");
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [rateId, setRateId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"rates" | "buy" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boughtUrl, setBoughtUrl] = useState<string | null>(null);

  const reset = () => {
    setRates(null);
    setRateId(null);
    setError(null);
  };

  const fetchRates = async () => {
    reset();
    const weightOz = Number(weight);
    if (!Number.isFinite(weightOz) || weightOz <= 0) return setError("Enter the weight in ounces");
    setBusy("rates");
    try {
      const res = await getRates({ orderId, presetId, weightOz });
      setRates(res.rates);
      setRateId(res.rates[0]?.id ?? null);
    } catch (e) {
      setError(getErrorMessage(e, "Couldn't get shipping prices"));
    } finally {
      setBusy(null);
    }
  };

  const buy = async () => {
    if (!rateId) return;
    setBusy("buy");
    setError(null);
    try {
      const { labelUrl } = await buyLabel({ orderId, rateId });
      toast.success("Label created. The tracking number is on the order.");
      setBoughtUrl(labelUrl);
    } catch (e) {
      setError(getErrorMessage(e, "Couldn't buy the label"));
    } finally {
      setBusy(null);
    }
  };

  const shipFrom = addresses?.shipFrom ?? null;
  const needsFrom = addresses !== undefined && (!shipFrom || editingFrom);
  const chosen = rates?.find((r) => r.id === rateId) ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          reset();
          setEditingFrom(false);
          setBoughtUrl(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="cursor-pointer">
          <Truck /> Create shipping label
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a shipping label</DialogTitle>
          <DialogDescription>
            {shipsTo ? `Ships to ${shipsTo}. ` : ""}The buyer's full address is printed on the label.
          </DialogDescription>
        </DialogHeader>

        {mode === "test" && (
          <p className="rounded-[5px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Test mode: labels are free samples and can't be mailed.
          </p>
        )}

        {boughtUrl ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm">
              Your label is ready. Print it at 4 × 6 in (or on plain paper and trim it), tape it to the package, and
              drop it off or schedule a pickup. Tracking updates on the order by itself.
            </p>
            <PrintLabelLink url={boughtUrl} />
          </div>
        ) : addresses === undefined ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : needsFrom ? (
          <AddressForm
            initial={shipFrom}
            submitLabel="Save return address"
            hint="Your return address goes on every label. Use a PO box if you don't want buyers to see your home address."
            onSubmit={async (address) => {
              await saveAddress({ kind: "ship_from", address });
              setEditingFrom(false);
              toast.success("Return address saved");
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3 rounded-[5px] border px-3 py-2 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Return address</p>
                <p>{shipFrom!.name}</p>
                <p className="text-muted-foreground">
                  {shipFrom!.street1}
                  {shipFrom!.street2 ? `, ${shipFrom!.street2}` : ""}, {shipFrom!.city}, {shipFrom!.state} {shipFrom!.zip}
                </p>
              </div>
              <Button variant="link" size="sm" className="h-auto cursor-pointer p-0" onClick={() => setEditingFrom(true)}>
                Change
              </Button>
            </div>

            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <div className="flex flex-col gap-1.5">
                <Label>Package</Label>
                <Select
                  value={presetId}
                  onValueChange={(v) => {
                    setPresetId(v);
                    reset();
                  }}
                >
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="label-weight">Weight (oz)</Label>
                <Input
                  id="label-weight"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value);
                    reset();
                  }}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Weigh it packed. Most worn items in a mailer are 3–8 oz; 16 oz = 1 lb.
            </p>

            {!rates && (
              <Button variant="secondary" className="cursor-pointer" disabled={busy !== null} onClick={fetchRates}>
                {busy === "rates" && <Spinner />} See shipping prices
              </Button>
            )}

            {rates && (
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Shipping service">
                {rates.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={r.id === rateId}
                    onClick={() => setRateId(r.id)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-[5px] border px-3 py-2 text-left text-sm transition-colors",
                      r.id === rateId ? "border-primary bg-primary/5" : "hover:bg-accent",
                    )}
                  >
                    <span>
                      <span className="font-semibold">{r.carrier}</span> {r.service}
                      {r.days ? <span className="text-muted-foreground"> · {r.days} day{r.days === 1 ? "" : "s"}</span> : null}
                    </span>
                    <span className="font-semibold">{formatPrice(r.cents)}</span>
                  </button>
                ))}
                <Button className="mt-2 cursor-pointer" disabled={!chosen || busy !== null} onClick={buy}>
                  {busy === "buy" ? <Spinner /> : <Printer />} Buy &amp; print label{chosen ? ` · ${formatPrice(chosen.cents)}` : ""}
                </Button>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
