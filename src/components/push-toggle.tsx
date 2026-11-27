"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { disablePush, enablePush, readPushState, type PushState } from "@/lib/push.ts";
import { cn } from "@/lib/utils.ts";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";

const NOTE: Partial<Record<PushState, string>> = {
  unsupported: "This browser doesn't support push notifications. Try Chrome, Edge, Firefox or Safari.",
  "needs-install":
    "On iPhone and iPad, add Taboo Desires to your Home Screen first: tap Share, then Add to Home Screen. Open the site from there and turn this on.",
  blocked: "Notifications are blocked for this site. Allow them in your browser or phone settings, then come back here.",
};

/** On/off switch for push notifications on this device. */
export default function PushToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    readPushState()
      .then((s) => live && setState(s))
      .catch(() => live && setState("off"));
    return () => {
      live = false;
    };
  }, []);

  const change = async (on: boolean) => {
    setBusy(true);
    try {
      const next = on ? await enablePush() : await disablePush();
      setState(next);
      if (on && next === "on") toast.success("Push notifications are on for this device");
      if (on && next === "blocked") toast.error("Notifications are blocked for this site");
    } catch {
      toast.error("Couldn't change push notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const note = NOTE[state];
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="push-toggle" className="cursor-pointer">
          {compact ? "Get notified on this device" : "Web Push Notifications"}
        </Label>
        <Switch
          id="push-toggle"
          checked={state === "on"}
          disabled={busy || state === "loading" || !!note}
          onCheckedChange={(v) => void change(v)}
          className="cursor-pointer"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {note ??
          "Get an alert on this device for new messages and notifications. Alerts never show names, titles or message text."}
      </p>
    </div>
  );
}
