import { useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { Check, ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { AccountType } from "@/shared/accounts.ts";
import { BUYER_PHOTO_MAX } from "@/shared/accounts.ts";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { useAccess } from "@/hooks/use-access.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";

const OPTIONS = [
  {
    id: "buyer",
    icon: ShoppingBag,
    title: "Buyer",
    price: "Free",
    perks: [
      "Post on the community board",
      "Message sellers",
      `Up to ${BUYER_PHOTO_MAX} profile photos`,
    ],
  },
  {
    id: "seller",
    icon: Store,
    title: "Seller",
    price: "Free to join",
    perks: [
      "Unlimited profile photos",
      "Go Pro to list items, reply to messages and post",
    ],
  },
] as const;

/** Shown once, right after a new member's first sign-in, until they pick an account type. */
export default function AccountTypeDialog() {
  const access = useAccess();
  const setAccountType = useMutation(api.users.setAccountType);
  const [choice, setChoice] = useState<AccountType>("buyer");
  const [saving, setSaving] = useState(false);

  // Admins already have full access, so they're never asked
  const open = !!access && !access.accountType && !access.isAdmin;

  const save = async () => {
    setSaving(true);
    try {
      await setAccountType({ accountType: choice });
      toast.success(choice === "buyer" ? "Welcome! Your buyer account is ready." : "Welcome! Your seller account is ready.");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not save your choice"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-3xl">How will you use Taboo Desires?</AlertDialogTitle>
          <AlertDialogDescription>
            Choose your account type. Buyers can become sellers later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((o) => {
            const active = choice === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setChoice(o.id)}
                aria-pressed={active}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
                  active ? "border-primary bg-primary/10" : "hover:border-primary/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-full text-violet-500">
                    <o.icon className="size-5" />
                  </span>
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border",
                      active && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {active && <Check className="size-3" />}
                  </span>
                </div>
                <div>
                  <p className="font-display text-2xl">{o.title}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">{o.price}</p>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {o.perks.map((p) => (
                    <li key={p} className="flex gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-violet-500" /> {p}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        <AlertDialogFooter>
          <Button onClick={save} disabled={saving} className="w-full cursor-pointer sm:w-auto">
            {saving && <Spinner />} Continue as {choice === "buyer" ? "a buyer" : "a seller"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
