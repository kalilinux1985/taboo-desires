import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "comment-surface flex field-sizing-content min-h-16 w-full rounded-[5px] border-0 bg-background px-4 py-2 text-[13px] text-white transition-[color,box-shadow] outline-none placeholder:text-white/70 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
