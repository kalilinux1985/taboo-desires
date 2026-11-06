import { useState, type ReactNode } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { planTotalCents } from "@/shared/plans.ts";

const lengthLabel = (months: number) => (months === 1 ? "1 month" : `${months} months`);

/**
 * Requests Premium for the chosen plan. Our team reviews each request and
 * switches Premium on; "pay another way" asks the seller how they'd like to pay.
 */
export default function RequestProDialog({
  months = 1,
  payAnotherWay = false,
  trigger,
}: {
  months?: number;
  payAnotherWay?: boolean;
  /** The button that opens the dialog */
  trigger: ReactNode;
}) {
  const requestPro = useMutation(api.subscriptions.requestPro);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const price = formatPrice(planTotalCents(months));

  const submit = async () => {
    if (payAnotherWay && !note.trim()) {
      toast.error("Tell us how you'd like to pay");
      return;
    }
    setSaving(true);
    try {
      await requestPro({ note, months, payAnotherWay });
      toast.success("Request sent. We'll switch on Premium once it's approved.");
      setOpen(false);
      setNote("");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not send request"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Premium · {lengthLabel(months)}
          </DialogTitle>
          <DialogDescription>
            {price} for {lengthLabel(months)}.{" "}
            {payAnotherWay
              ? "Tell us how you'd like to pay and we'll get back to you with the details."
              : "Our team reviews each request and turns Premium on for your shop, usually within a day."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="pro-note">
            {payAnotherWay ? "How would you like to pay?" : "Message for our team (optional)"}
          </Label>
          <Textarea
            id="pro-note"
            rows={4}
            maxLength={500}
            placeholder={payAnotherWay ? "For example: gift card, crypto, bank transfer..." : "Anything we should know."}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} className="cursor-pointer">
            {saving && <Spinner />} Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
