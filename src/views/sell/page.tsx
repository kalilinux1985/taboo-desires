"use client";

import { useNavigate } from "@/lib/navigation.ts";
import { useMutation } from "@/lib/backend/react.tsx";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { deniedMessage } from "@/shared/accounts.ts";
import RequireAuth from "@/components/require-auth.tsx";
import UpgradeNotice from "@/components/upgrade-notice.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useAccess } from "@/hooks/use-access.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import ListingForm, { type ListingSubmit } from "./_components/listing-form.tsx";

function BecomeSeller() {
  const setAccountType = useMutation(api.users.setAccountType);
  const switchToSeller = async () => {
    try {
      await setAccountType({ accountType: "seller" });
      toast.success("You're now a seller. Go Pro to start listing.");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not switch account"));
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <UpgradeNotice message={deniedMessage("list", "buyer")} showUpgrade={false} />
      <p className="text-sm text-muted-foreground">
        Seller accounts are free. Pro unlocks listings, replying to messages, and community posts.
        Sellers can't switch back to a buyer account.
      </p>
      <Button onClick={switchToSeller} className="w-fit cursor-pointer">
        <Store /> Become a seller
      </Button>
    </div>
  );
}

function SellForm() {
  const navigate = useNavigate();
  const access = useAccess();
  const create = useMutation(api.listings.create);

  if (access === undefined) return <Skeleton className="h-96 w-full" />;
  if (access === null) return null;
  if (access.accountType === "buyer" && !access.isAdmin) return <BecomeSeller />;
  if (!access.can.list) return <UpgradeNotice message={deniedMessage("list", access.accountType ?? undefined)} />;

  const onSubmit = async ({ durationHours, ...values }: ListingSubmit) => {
    try {
      const id = await create({
        ...values,
        durationHours: values.saleType === "auction" ? durationHours : undefined,
      });
      toast.success(values.saleType === "auction" ? "Your auction is live" : "Your listing is live");
      navigate(`/listing/${id}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not create listing"));
    }
  };

  return <ListingForm submitLabel="Publish listing" onSubmit={onSubmit} />;
}

export default function SellPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-5xl md:text-6xl">Sell an item</h1>
      <p className="pb-8 pt-2 text-muted-foreground">
        List it in a minute. Keep every dollar. Stay anonymous.
      </p>
      <RequireAuth message="Sign in to start selling on Taboo Desires.">
        <SellForm />
      </RequireAuth>
    </div>
  );
}
