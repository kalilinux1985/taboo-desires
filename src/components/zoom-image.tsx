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
        <DialogContent className="flex h-[92dvh] w-[96vw] max-w-[96vw] items-center justify-center border-0 bg-transparent p-0 shadow-none sm:max-w-[96vw]">
          <DialogTitle className="sr-only">{alt || "Picture"}</DialogTitle>
          <DialogDescription className="sr-only">Larger view of the picture</DialogDescription>
          {/* Fills the screen (keeping its shape), so it is always bigger than the thumbnail */}
          <img src={src} alt={alt} className="size-full rounded-[5px] object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
