import { useState } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import {
  BUYER_DETAIL_FIELDS,
  LOOKING_FOR_OPTIONS,
  type BuyerDetails,
} from "@/shared/buyerDetails.ts";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";

// Select items can't use an empty value, so this stands in for "not answered"
const NONE = "none";

/** Buyer-only profile answers shown on the buyer profile's About card. */
export default function BuyerDetailsForm({ initial }: { initial: BuyerDetails }) {
  const update = useMutation(api.users.updateBuyerDetails);
  const [details, setDetails] = useState<BuyerDetails>(initial);
  const [saving, setSaving] = useState(false);
  const picks = details.lookingFor ?? [];

  const toggle = (item: string) =>
    setDetails((d) => {
      const current = d.lookingFor ?? [];
      return { ...d, lookingFor: current.includes(item) ? current.filter((i) => i !== item) : [...current, item] };
    });

  const save = async () => {
    setSaving(true);
    try {
      const clean: BuyerDetails = {};
      for (const f of BUYER_DETAIL_FIELDS) if (details[f.key]) clean[f.key] = details[f.key];
      if (picks.length) clean.lookingFor = picks;
      await update({ details: clean });
      toast.success("Details saved");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not save details"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {BUYER_DETAIL_FIELDS.map((field) => {
          const id = `buyer-${field.key}`;
          return (
            <div key={field.key} className="grid gap-2">
              <Label htmlFor={id}>{field.label}</Label>
              <Select
                value={details[field.key] ?? NONE}
                onValueChange={(v) => setDetails((d) => ({ ...d, [field.key]: v === NONE ? undefined : v }))}
              >
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
            </div>
          );
        })}
      </div>
      <div className="grid gap-2">
        <Label>What I&apos;m looking for</Label>
        <div className="flex flex-wrap gap-2">
          {LOOKING_FOR_OPTIONS.map((item) => {
            const on = picks.includes(item);
            return (
              <button
                key={item}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item)}
                className={cn(
                  "flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  on ? "border-transparent bg-primary text-primary-foreground" : "border-[#1a2238]/45 hover:bg-secondary",
                )}
              >
                {on && <Check className="size-3" />} {item}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="cursor-pointer">
          {saving && <Spinner />} Save details
        </Button>
      </div>
    </div>
  );
}
