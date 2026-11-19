"use client";

import { Button } from "@/components/ui/button.tsx";
import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog.tsx";
import { cn } from "@/lib/utils.ts";

/** A picture that opens larger in a popup when clicked. `children` is the thumbnail. */
export default function ZoomImage({
  src,
  alt = "",
  className,
  children,
}: {
  src: string;
  alt?: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="plain" size="none"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View larger"
        className={cn("block cursor-zoom-in", className)}
      >
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-auto max-w-[95vw] border-0 bg-transparent p-0 shadow-none sm:max-w-[95vw]">
          <DialogTitle className="sr-only">{alt || "Picture"}</DialogTitle>
          <DialogDescription className="sr-only">Larger view of the picture</DialogDescription>
          <img src={src} alt={alt} className="mx-auto max-h-[85dvh] max-w-full rounded-[5px] object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
