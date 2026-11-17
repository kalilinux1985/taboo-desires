"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

export type ReportType = "nonconsensual_intimate" | "underage" | "copyright" | "illegal" | "harassment" | "other";
export type ReportTarget = { kind: "listing" | "post" | "comment" | "profile"; id: string };

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "nonconsensual_intimate", label: "Intimate image shared without consent (including fakes)" },
  { value: "underage", label: "Someone who is, or looks, under 18" },
  { value: "copyright", label: "Copyright infringement" },
  { value: "illegal", label: "Illegal content or activity" },
  { value: "harassment", label: "Harassment, threats or impersonation" },
  { value: "other", label: "Something else" },
];

const NEEDS_DEPICTED: ReportType[] = ["nonconsensual_intimate", "copyright"];

/**
 * Report content or ask for a takedown. Open to everyone, signed in or not, because the
 * person shown in an image is often not a member.
 */
export default function ReportForm({
  target,
  defaultType = "nonconsensual_intimate",
  onDone,
}: {
  target?: ReportTarget;
  defaultType?: ReportType;
  onDone?: () => void;
}) {
  const submit = useMutation(api.reports.submit);
  const { user } = useAuth();
  const [type, setType] = useState<ReportType>(defaultType);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [depicted, setDepicted] = useState(false);
  const [goodFaith, setGoodFaith] = useState(false);
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!goodFaith) return void toast.error("Please confirm the statement before sending");
    setBusy(true);
    try {
      await submit({
        reportType: type,
        targetKind: target?.kind ?? "other",
        targetId: target?.id,
        targetUrl: url.trim() || (target ? window.location.href : undefined),
        description,
        reporterName: name,
        reporterEmail: email,
        isDepicted: depicted,
        signature,
      });
      setSent(email.trim());
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not send your report"));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    const urgent = type === "nonconsensual_intimate" || type === "underage";
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="size-10 text-[#7b3aec]" />
        <h3 className="text-xl">Report received</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {urgent
            ? "We review these within 48 hours and remove content that breaks the rules."
            : "We review reports within 7 days and remove content that breaks the rules."}{" "}
          We may contact you at {sent} if we need more information.
        </p>
        {onDone && (
          <Button type="button" onClick={onDone} className="cursor-pointer">
            Close
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="report-type">What is the problem?</Label>
        <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
          <SelectTrigger id="report-type" className="w-full cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#111317] shadow-none">
            {REPORT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="cursor-pointer">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!target && (
        <div className="grid gap-2">
          <Label htmlFor="report-url">Link to the content</Label>
          <Input
            id="report-url"
            name="url"
            type="url"
            required
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Copy the page address from your browser. Add one report per link.</p>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="report-description">Details</Label>
        <Textarea
          id="report-description"
          name="description"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          placeholder="What is wrong, and where exactly can we find it?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="report-name">Your name</Label>
          <Input id="report-name" name="name" autoComplete="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="report-email">Your email</Label>
          <Input id="report-email" name="email" type="email" autoComplete="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      {NEEDS_DEPICTED.includes(type) && (
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="depicted"
            checked={depicted}
            onChange={(e) => setDepicted(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#7b3aec]"
          />
          <span>
            {type === "copyright"
              ? "I own the copyright, or I'm authorized to act for the owner."
              : "I am the person shown, or I'm authorized to act for them."}
          </span>
        </label>
      )}

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="good-faith"
          required
          checked={goodFaith}
          onChange={(e) => setGoodFaith(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#7b3aec]"
        />
        <span>I believe in good faith that this report is accurate and that the content breaks the rules or the law.</span>
      </label>

      <div className="grid gap-2">
        <Label htmlFor="report-signature">Signature (type your full name)</Label>
        <Input id="report-signature" name="signature" required maxLength={100} value={signature} onChange={(e) => setSignature(e.target.value)} />
      </div>

      <Button type="submit" disabled={busy} className="w-fit cursor-pointer">
        {busy && <Spinner />} Send report
      </Button>
    </form>
  );
}
