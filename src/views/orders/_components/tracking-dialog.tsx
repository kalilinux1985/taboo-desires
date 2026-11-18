"use client";

import { useState, type FormEvent } from "react";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
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
import { getErrorMessage } from "@/lib/listings.ts";
import { CARRIERS } from "@/shared/shipping.ts";

/** For sellers who bought postage somewhere else: add the tracking number by hand. */
export default function TrackingDialog({ orderId }: { orderId: Id<"orders"> }) {
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState<string>("USPS");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addTracking = useMutation(api.orders.addTracking);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await addTracking({ orderId, carrier, trackingCode: code });
      toast.success("Marked as shipped");
      setOpen(false);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save the tracking number"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="cursor-pointer">
          <PackageCheck /> I shipped it myself
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add tracking</DialogTitle>
          <DialogDescription>Bought postage somewhere else? Enter the tracking number so the buyer can follow it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Carrier</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((c) => (
                    <SelectItem key={c} value={c} className="cursor-pointer">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tracking-code">Tracking number</Label>
              <Input id="tracking-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} autoCapitalize="characters" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy || !code.trim()} className="cursor-pointer">
            {busy && <Spinner />} Mark as shipped
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
