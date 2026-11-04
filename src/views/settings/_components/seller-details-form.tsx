import { useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import {
  SELLER_DETAIL_FIELDS,
  type SellerDetails,
} from "@/shared/sellerDetails.ts";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";

// Select items can't use an empty value, so this stands in for "not answered"
const NONE = "none";

type Field = (typeof SELLER_DETAIL_FIELDS)[number];

function DetailSelect({
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

/** Seller-only optional details, with the less common ones behind "See more". */
export default function SellerDetailsForm({ initial }: { initial: SellerDetails }) {
  const update = useMutation(api.users.updateSellerDetails);
  const [details, setDetails] = useState<SellerDetails>(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key: Field["key"], value: string | undefined) =>
    setDetails((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      // Drop unanswered fields so they're cleared rather than stored empty
      const clean = Object.fromEntries(
        Object.entries(details).filter(([, v]) => v !== undefined),
      ) satisfies SellerDetails;
      await update({ details: clean });
      toast.success("Details saved");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not save details"));
    } finally {
      setSaving(false);
    }
  };

  const render = (f: Field) => (
    <DetailSelect key={f.key} field={f} value={details[f.key]} onChange={(v) => set(f.key, v)} />
  );
  const primary = SELLER_DETAIL_FIELDS.filter((f) => "primary" in f);
  const more = SELLER_DETAIL_FIELDS.filter((f) => !("primary" in f));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">{primary.map(render)}</div>
      <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-4">
        <CollapsibleTrigger asChild>
          <Button variant="secondary" className="w-full cursor-pointer">
            {open ? "See less" : "See more"}
            <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="grid gap-4 sm:grid-cols-2">{more.map(render)}</CollapsibleContent>
      </Collapsible>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="cursor-pointer">
          {saving && <Spinner />} Save details
        </Button>
      </div>
    </div>
  );
}
