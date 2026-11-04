import { useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
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
import { getErrorMessage } from "@/lib/listings.ts";

const LOST = [
  "Your profile, profile picture, and photo gallery",
  "All of your listings, auctions, and premium photo sets",
  "Your messages and conversations",
  "Your community posts and replies",
  "Reviews you wrote and received, follows, and favorites",
  "Your Pro plan and verified badge",
];

/** Permanently deletes the account after a typed confirmation. */
export default function DeleteAccount() {
  const deleteAccount = useMutation(api.accountDeletion.deleteMyAccount);
  const { signout } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = confirm.trim().toUpperCase() === "DELETE";

  const run = async () => {
    setBusy(true);
    try {
      await deleteAccount({ confirmation: confirm });
      toast.success("Your account has been deleted");
      await signout();
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not delete your account"));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) setConfirm("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="cursor-pointer">
          <Trash2 /> Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This is permanent and can't be undone. All of your content will be permanently deleted:
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {LOST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="grid gap-2">
          <Label htmlFor="confirm-delete">
            Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm
          </Label>
          <Input
            id="confirm-delete"
            autoComplete="off"
            placeholder="DELETE"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button variant="destructive" disabled={!ready || busy} onClick={run} className="cursor-pointer">
            {busy && <Spinner />} Permanently delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
