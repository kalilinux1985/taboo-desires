"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";

/** Account-wide switch for read receipts and typing indicators in messages. */
export default function ReadReceiptsToggle({ className }: { className?: string }) {
  const on = useQuery(api.users.readReceipts, {});
  const save = useMutation(api.users.setReadReceipts);
  const [busy, setBusy] = useState(false);

  const change = async (next: boolean) => {
    setBusy(true);
    try {
      await save({ on: next });
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't change read receipts"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="read-receipts" className="cursor-pointer">
          Read Receipts &amp; Typing
        </Label>
        <Switch
          id="read-receipts"
          checked={on ?? true}
          disabled={busy || on === undefined || on === null}
          onCheckedChange={(v) => void change(v)}
          className="cursor-pointer"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Let people you message see when you've read their messages and when you're typing. If you turn this off, you
        won't see theirs either.
      </p>
    </div>
  );
}
