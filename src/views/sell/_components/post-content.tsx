"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { useAccess } from "@/hooks/use-access.ts";
import { useNavigate } from "@/lib/navigation.ts";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import ListingForm, { type ListingSubmit } from "./listing-form.tsx";

/**
 * "Post Content": a seller posts Instant Content (locked photos or a locked
 * video with a public thumbnail). Shown to sellers on their profile's Instant
 * Content tab and on the Instant Content pages from the navbar.
 */
export default function PostContentButton({ className }: { className?: string }) {
  const access = useAccess();
  const mine = useQuery(api.subscriptions.mine, access ? {} : "skip");
  const create = useMutation(api.listings.create);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!access || (access.accountType !== "seller" && !access.isAdmin)) return null;
  const allowed = !!mine?.limits.lockedContent && access.can.list;

  const onSubmit = async ({ durationHours: _d, ...values }: ListingSubmit) => {
    try {
      const id = await create({ ...values, saleType: "fixed" });
      toast.success("Your Instant Content is live");
      setOpen(false);
      navigate(`/listing/${id}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not post your content"));
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("h-[38px] cursor-pointer gap-2 rounded-[5px] bg-violet-600 px-4 text-white hover:bg-violet-600", className)}
      >
        <Plus className="size-4" /> Post Content
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-5 text-violet-600" /> Post Instant Content
            </DialogTitle>
            <DialogDescription>
              Locked photos or a video that buyers unlock instantly. Only the thumbnail is public.
            </DialogDescription>
          </DialogHeader>
          {mine === undefined ? null : allowed ? (
            <ListingForm instant submitLabel="Post content" onSubmit={onSubmit} />
          ) : (
            <div className="flex flex-col gap-3 py-2 text-sm">
              <p>Instant Content is a Pro feature. Upgrade to post locked photos and videos.</p>
              <Button asChild className="w-fit cursor-pointer bg-violet-600 text-white hover:bg-violet-600">
                <Link href="/pricing">See Pro</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
