"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils.ts";

/**
 * The bio cut to a few lines, with "+ See More" to show the rest. The button
 * only appears when the text is actually cut off.
 */
export default function ExpandableBio({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measured while clamped; re-measured when the width changes (rotating a phone)
    const measure = () => {
      if (!open) setCut(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, open]);

  return (
    <div className={cn("flex flex-col items-start gap-4", className)}>
      <p
        ref={ref}
        id="profile-bio"
        className={cn("whitespace-pre-line break-words text-slate-300", !open && "line-clamp-4")}
      >
        {text}
      </p>
      {(cut || open) && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls="profile-bio"
          onClick={() => setOpen((o) => !o)}
          className="cursor-pointer rounded-[5px] border border-violet-600 px-3 py-1 text-xs font-bold text-violet-600 transition-colors hover:bg-violet-600 hover:text-white"
        >
          {open ? "− See Less" : "+ See More"}
        </button>
      )}
    </div>
  );
}
