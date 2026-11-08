"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { supabase } from "@/lib/backend/client.ts";
import { SELLER_DETAIL_FIELDS, type SellerDetails } from "@/shared/sellerDetails.ts";
import {
  OFFERINGS,
  PAYMENT_METHODS,
  SETTING_FIELDS,
  type SellerSettings,
  type SettingKey,
} from "@/shared/sellerSettings.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx";
import MultiSelect from "@/components/multi-select.tsx";
import { DetailSelect, type Field } from "./detail-select.tsx";

const MIN_PASSWORD = 6;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

type SettingsState = Record<SettingKey, string> & { paymentMethods: string[]; offerings: string[] };

function Form({
  initialDetails,
  initialSettings,
  email,
}: {
  initialDetails: SellerDetails;
  initialSettings: SettingsState;
  email: string;
}) {
  const updateDetails = useMutation(api.users.updateSellerDetails);
  const updateSettings = useMutation(api.users.updateSettings);
  const [details, setDetails] = useState<SellerDetails>(initialDetails);
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [newEmail, setNewEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const setDetail = (key: Field["key"], value: string | undefined) =>
    setDetails((d) => ({ ...d, [key]: value }));
  const setSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const primary = SELLER_DETAIL_FIELDS.filter((f) => "primary" in f);
  const more = SELLER_DETAIL_FIELDS.filter((f) => !("primary" in f));
  const renderDetail = (f: Field) => (
    <DetailSelect key={f.key} field={f} value={details[f.key]} onChange={(v) => setDetail(f.key, v)} />
  );

  const save = async () => {
    const emailChanged = newEmail.trim().toLowerCase() !== email.toLowerCase();
    if (password && password.length < MIN_PASSWORD) {
      toast.error(`Use a password of at least ${MIN_PASSWORD} characters`);
      return;
    }
    setSaving(true);
    try {
      // Unanswered details are dropped so they're cleared rather than stored empty
      const cleanDetails = Object.fromEntries(
        Object.entries(details).filter(([, v]) => v !== undefined),
      ) satisfies SellerDetails;
      await updateDetails({ details: cleanDetails });
      await updateSettings({ settings: settings satisfies SellerSettings });

      if (emailChanged || password) {
        const { error } = await supabase.auth.updateUser({
          ...(emailChanged ? { email: newEmail.trim() } : {}),
          ...(password ? { password } : {}),
        });
        if (error) throw error;
        setPassword("");
        if (emailChanged) toast.info("Check both inboxes to confirm your new email address.");
      }
      toast.success("Settings updated");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not update your settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title="More About You">
        {primary.map(renderDetail)}
        <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-4">
          <CollapsibleTrigger asChild>
            <Button variant="secondary" className="w-full cursor-pointer">
              {open ? "See Less" : "See More"}
              <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-4">
            {more.map(renderDetail)}
            <div className="grid gap-2">
              <Label htmlFor="payment-methods">Payment Methods</Label>
              <MultiSelect
                id="payment-methods"
                options={PAYMENT_METHODS}
                value={settings.paymentMethods}
                onChange={(v) => setSetting("paymentMethods", v)}
                placeholder="Select payment methods you accept..."
              />
              <Hint>Shown on your profile so buyers know how they can pay you.</Hint>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offerings">What I Offer</Label>
              <MultiSelect
                id="offerings"
                options={OFFERINGS}
                value={settings.offerings}
                onChange={(v) => setSetting("offerings", v)}
                placeholder="Select what I offer..."
              />
              <Hint>To increase your visibility, please select what you offer.</Hint>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Section>

      <Section title="Login Credentials">
        <div className="grid gap-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Hint>Updating your email address will require you to re-verify your email address.</Hint>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Hint>Please leave blank if you do not wish to change. Use a minimum of {MIN_PASSWORD} characters.</Hint>
        </div>
      </Section>

      <Section title="Notifications & Visibility">
        {SETTING_FIELDS.map((f) => (
          <div key={f.key} className="grid gap-2">
            <Label htmlFor={`setting-${f.key}`}>{f.label}</Label>
            <Select value={settings[f.key]} onValueChange={(v) => setSetting(f.key, v)}>
              <SelectTrigger id={`setting-${f.key}`} className="w-full cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {f.choices.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="cursor-pointer">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Hint>
              {f.hint}
              {"comingSoon" in f && f.comingSoon && (
                <span className="ml-1 font-semibold text-violet-600">Coming soon.</span>
              )}
            </Hint>
          </div>
        ))}
        <Button onClick={save} disabled={saving} className="w-fit cursor-pointer">
          {saving && <Spinner />} Update Settings
        </Button>
      </Section>
    </div>
  );
}

/** Seller Settings below the profile card: details, login and notification choices. */
export default function SellerSettingsForm({
  details,
  email,
}: {
  details: SellerDetails;
  email: string;
}) {
  const settings = useQuery(api.users.mySettings, {});
  if (settings === undefined) return <Skeleton className="h-96 w-full" />;
  if (settings === null) return null;
  return <Form initialDetails={details} initialSettings={settings as SettingsState} email={email} />;
}
