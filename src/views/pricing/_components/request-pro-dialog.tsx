import { useState } from "react";
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
import { PRO_PRICE_CENTS } from "@/shared/plans.ts";

export default function RequestProDialog({ label }: { label: string }) {
  const requestPro = useMutation(api.subscriptions.requestPro);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await requestPro({ note });
      toast.success("Request sent. We'll switch on Pro once it's approved.");
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
      <DialogTrigger asChild>
        <Button size="lg" className="w-full cursor-pointer">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Request Pro</DialogTitle>
          <DialogDescription>
            Pro is {formatPrice(PRO_PRICE_CENTS)} a month. Our team reviews each request and
            turns Pro on for your shop, usually within a day.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="pro-note">Message for our team (optional)</Label>
          <Textarea
            id="pro-note"
            rows={4}
            maxLength={500}
            placeholder="How you'd like to pay, or anything we should know."
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
