"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { cn } from "@/lib/utils.ts";
import ReportForm, { type ReportTarget } from "./report-form.tsx";

/** A small "Report" button that opens the report form for one listing, post, comment or profile. */
export default function ReportButton({
  target,
  label = "Report",
  iconOnly = false,
  className,
}: {
  target: ReportTarget;
  label?: string;
  /** Just the flag icon, for tight spaces */
  iconOnly?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Report this ${target.kind}`}
        title={`Report this ${target.kind}`}
        className={cn("cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground", className)}
      >
        <Flag className="size-4" /> {!iconOnly && label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Report this {target.kind}</DialogTitle>
            <DialogDescription>
              Tell us what's wrong. You don't need an account, and we review every report.
            </DialogDescription>
          </DialogHeader>
          <ReportForm target={target} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
