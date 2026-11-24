import { SELLER_DETAIL_FIELDS } from "@/shared/sellerDetails.ts";
import { cn } from "@/lib/utils.ts";
import { Label } from "@/components/ui/label.tsx";
import { REQUIRED_BASICS } from "@/lib/settings.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

// Select items can't use an empty value, so this stands in for "not answered"
const NONE = "none";

export type Field = (typeof SELLER_DETAIL_FIELDS)[number];

export function DetailSelect({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const id = `detail-${field.key}`;
  // Age, country and gender must be chosen: no "Prefer not to say"
  const required = REQUIRED_BASICS.includes(field.key);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {field.label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value ?? (required ? "" : NONE)} onValueChange={(v) => onChange(v === NONE ? undefined : v)}>
        <SelectTrigger id={id} aria-required={required} className={cn("w-full cursor-pointer", required && !value && "ring-1 ring-red-500/70")}>
          <SelectValue placeholder={required ? "Required: choose one" : "Choose"} />
        </SelectTrigger>
        <SelectContent className="settings-menu max-h-72 bg-[#111317] shadow-none">
          {!required && (
            <SelectItem value={NONE} className="cursor-pointer text-muted-foreground">
              Prefer not to say
            </SelectItem>
          )}
          {field.options.map((o) => (
            <SelectItem key={o} value={o} className="cursor-pointer">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {"hint" in field && <p className="text-xs text-muted-foreground">{field.hint}</p>}
    </div>
  );
}
