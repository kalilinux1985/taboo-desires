import { useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { AUCTION_DURATIONS } from "@/shared/bidding.ts";
import { Button } from "@/components/ui/button.tsx";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { getErrorMessage } from "@/lib/listings.ts";

/** Restarts an auction that ended without bids. */
export default function RelistAuctionButton({ listingId }: { listingId: Id<"listings"> }) {
  const relist = useMutation(api.auctions.relist);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("72");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await relist({ listingId, durationHours: Number(hours) });
      toast.success("Auction restarted");
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not relist"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="cursor-pointer">
          <RotateCcw /> Relist auction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run this auction again</DialogTitle>
          <DialogDescription>
            Same starting bid. Edit the listing afterwards if you want to change it.
          </DialogDescription>
        </DialogHeader>
        <Select value={hours} onValueChange={setHours}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUCTION_DURATIONS.map((d) => (
              <SelectItem key={d.hours} value={String(d.hours)}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button onClick={submit} disabled={busy} className="cursor-pointer">
            {busy && <Spinner />} Start auction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
