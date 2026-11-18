"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { cleanAddress, US_STATES, type ShippingAddress } from "@/shared/shipping.ts";

export type AddressInput = Omit<ShippingAddress, "country">;

/**
 * US address form. Checks the fields in the browser, then hands them to
 * `onSubmit`, which verifies them with the carrier on the server.
 */
export default function AddressForm({
  initial,
  submitLabel,
  saveLabel,
  hint,
  onSubmit,
}: {
  initial?: Partial<ShippingAddress> | null;
  submitLabel: string;
  /** Shows a "remember this address" switch with this label */
  saveLabel?: string;
  hint?: string;
  onSubmit: (address: AddressInput, save: boolean) => Promise<void>;
}) {
  const [a, setA] = useState<Record<keyof AddressInput, string>>({
    name: initial?.name ?? "",
    street1: initial?.street1 ?? "",
    street2: initial?.street2 ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    zip: initial?.zip ?? "",
    phone: initial?.phone ?? "",
  });
  const [save, setSave] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof AddressInput) => (e: { target: { value: string } }) =>
    setA((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const checked = cleanAddress(a);
    if (!checked.ok) return setError(checked.message);
    setError(null);
    setBusy(true);
    try {
      const { country: _country, ...rest } = checked.address;
      await onSubmit(rest, save);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save that address"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="addr-name">Name on the label</Label>
        <Input id="addr-name" autoComplete="name" value={a.name} onChange={set("name")} maxLength={60} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="addr-street1">Street address or PO box</Label>
        <Input id="addr-street1" autoComplete="address-line1" value={a.street1} onChange={set("street1")} maxLength={80} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="addr-street2">Apt, suite, unit (optional)</Label>
        <Input id="addr-street2" autoComplete="address-line2" value={a.street2} onChange={set("street2")} maxLength={80} />
      </div>
      <div className="grid grid-cols-[1fr_6rem_7rem] gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="addr-city">City</Label>
          <Input id="addr-city" autoComplete="address-level2" value={a.city} onChange={set("city")} maxLength={60} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>State</Label>
          <Select value={a.state} onValueChange={(state) => setA((p) => ({ ...p, state }))}>
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s} value={s} className="cursor-pointer">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="addr-zip">ZIP</Label>
          <Input id="addr-zip" autoComplete="postal-code" inputMode="numeric" value={a.zip} onChange={set("zip")} maxLength={10} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="addr-phone">Phone (optional, some carriers need it)</Label>
        <Input id="addr-phone" type="tel" autoComplete="tel" value={a.phone} onChange={set("phone")} maxLength={20} />
      </div>
      {saveLabel && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Switch checked={save} onCheckedChange={setSave} />
          {saveLabel}
        </label>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="cursor-pointer">
        {busy && <Spinner />} {submitLabel}
      </Button>
    </form>
  );
}
