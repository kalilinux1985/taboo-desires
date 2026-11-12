"use client";

import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { cn } from "@/lib/utils.ts";

/** Pick any number of options from a list; shows the choices joined in the button. */
export default function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const toggle = (option: string) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-slot="select-trigger"
          className="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-[1px] border bg-background px-3 text-left text-sm"
        >
          <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
            {value.length ? value.join(", ") : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-(--radix-popover-trigger-width) overflow-y-auto p-1">
        {options.map((option) => {
          const on = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              role="menuitemcheckbox"
              aria-checked={on}
              onClick={() => toggle(option)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-[1px] px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span className={cn("flex size-4 items-center justify-center rounded-[1px] border", on && "border-primary bg-primary text-primary-foreground")}>
                {on && <Check className="size-3" />}
              </span>
              {option}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
