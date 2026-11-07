import { SELLER_DETAIL_FIELDS } from "@/shared/sellerDetails.ts";
import { Label } from "@/components/ui/label.tsx";
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
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{field.label}</Label>
      <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? undefined : v)}>
        <SelectTrigger id={id} className="w-full cursor-pointer">
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={NONE} className="cursor-pointer text-muted-foreground">
            Prefer not to say
          </SelectItem>
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
