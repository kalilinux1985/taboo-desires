"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Check, ExternalLink, FileSignature, MessageSquarePlus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType, Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";

export type ContractData = NonNullable<FunctionReturnType<typeof api.contracts.get>>;
type Payment = { dueDate: string; amountCents: number; /** What the seller is typing in the amount box */ amountText?: string };
type Frequency = "weekly" | "biweekly" | "monthly";

const usd = (cents: number) => formatPrice(cents).replace(/^\$(\d+)$/, "$$$1.00");
const dateLabel = (iso: string) => format(parseISO(iso), "MMM d, yyyy");
const isoDay = (d: Date) => format(d, "yyyy-MM-dd");

/** Splits a total into equal payments (any leftover cents go on the first) on a regular schedule. */
export function buildSchedule(totalCents: number, count: number, first: string, frequency: Frequency): Payment[] {
  if (!first || count < 1 || totalCents <= 0) return [];
  const base = Math.floor(totalCents / count);
  const start = parseISO(first);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    if (frequency === "weekly") d.setDate(d.getDate() + 7 * i);
    else if (frequency === "biweekly") d.setDate(d.getDate() + 14 * i);
    else d.setMonth(d.getMonth() + i);
    return { dueDate: isoDay(d), amountCents: base + (i === 0 ? totalCents - base * count : 0) };
  });
}

const STATUS: Record<ContractData["status"], { label: string; className: string }> = {
  pending: { label: "Waiting for buyer", className: "bg-violet-600 text-white" },
  accepted: { label: "Accepted", className: "bg-green-600 text-white" },
  rejected: { label: "Rejected", className: "bg-red-600 text-white" },
  cancelled: { label: "Withdrawn", className: "bg-white/15 text-white" },
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-white/70">{label}</span>
      <span className="min-w-0 text-right text-white">{children}</span>
    </div>
  );
}

/** The contract's terms: item link, total, payments and the schedule. Shared by Messages and Orders. */
export function ContractTerms({ c }: { c: Omit<ContractData, "role" | "comments"> }) {
  return (
    <div className="flex flex-col">
      <Row label="Item">
        {c.itemUrl ? (
          <a href={c.listingId ? `/listing/${c.listingId}` : c.itemUrl} target={c.listingId ? undefined : "_blank"} rel="noreferrer" className="inline-flex items-center gap-1 text-violet-600 hover:underline">
            <span className="truncate">{c.itemTitle}</span> <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : (
          c.itemTitle
        )}
      </Row>
      <Row label="Total">
        <span className="font-bold">{usd(c.totalCents)}</span>
      </Row>
      <Row label="Payments">
        {c.paymentCount} {c.paymentCount === 1 ? "payment" : "payments"}
        {c.paymentCount > 1 && ` of about ${usd(Math.floor(c.totalCents / c.paymentCount))}`}
      </Row>
      {c.paymentMethod && <Row label="Paid by">{c.paymentMethod}</Row>}
      <div className="mt-2 overflow-hidden rounded-[5px] border border-white/10">
        <div className="grid grid-cols-[2.5rem_1fr_auto] bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wide text-white/70">
          <span>#</span>
          <span>Due date</span>
          <span>Amount</span>
        </div>
        {c.schedule.map((p, i) => (
          <div key={i} className="grid grid-cols-[2.5rem_1fr_auto] border-t border-white/10 px-3 py-1.5 text-sm text-white">
            <span className="text-violet-600">{i + 1}</span>
            <span>{dateLabel(p.dueDate)}</span>
            <span className="tabular-nums">{usd(p.amountCents)}</span>
          </div>
        ))}
      </div>
      {c.terms && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide text-white/70">Terms</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white">{c.terms}</p>
        </div>
      )}
    </div>
  );
}

/** The contract card as drawn in a conversation (data comes in; actions go out). */
export function ContractCardView({
  c,
  busy,
  onAccept,
  onReject,
  onWithdraw,
  onComment,
}: {
  c: ContractData;
  busy?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onWithdraw?: () => void;
  onComment?: (body: string) => Promise<void> | void;
}) {
  const [commenting, setCommenting] = useState(false);
  const [text, setText] = useState("");
  const status = STATUS[c.status];
  const pending = c.status === "pending";

  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-[5px] border border-violet-600/60 bg-[#141519] shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-3 bg-violet-600/15 px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-[5px] bg-violet-600 text-white">
          <FileSignature className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-white">Sales contract</p>
          <p className="text-xs text-white/70">Sent {format(c._creationTime, "MMM d, yyyy h:mm a")}</p>
        </div>
        <span className={cn("shrink-0 rounded-[5px] px-2 py-0.5 text-xs font-bold", status.className)}>{status.label}</span>
      </div>

      <div className="px-4 py-3">
        <ContractTerms c={c} />
      </div>

      {c.comments.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-white/70">Comments</p>
          {c.comments.map((m) => (
            <div key={m._id} className="rounded-[5px] bg-[#202227] px-3 py-2">
              <p className="text-xs">
                <span className="font-bold text-violet-600">{m.mine ? "You" : m.authorName}</span>{" "}
                <span className="text-white/60">{format(m._creationTime, "MMM d, h:mm a")}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white">{m.body}</p>
            </div>
          ))}
        </div>
      )}

      {commenting && (
        <form
          className="flex flex-col gap-2 border-t border-white/10 px-4 py-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            await onComment?.(text.trim());
            setText("");
            setCommenting(false);
          }}
        >
          <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} placeholder="Add a comment to the contract" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={() => setCommenting(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy || !text.trim()} className="cursor-pointer bg-violet-600 text-white hover:bg-violet-600">
              <Send /> Post comment
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-[#101115] px-4 py-3">
        {pending && c.role === "buyer" && (
          <>
            <Button size="sm" disabled={busy} onClick={onAccept} className="cursor-pointer bg-green-600 text-white hover:bg-green-500">
              <Check /> Accept
            </Button>
            <Button size="sm" disabled={busy} onClick={onReject} className="cursor-pointer bg-red-600 text-white hover:bg-red-500">
              <X /> Reject
            </Button>
          </>
        )}
        {!commenting && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setCommenting(true)} className="cursor-pointer border-violet-600 text-white hover:bg-violet-600/20">
            <MessageSquarePlus /> Add comment
          </Button>
        )}
        {pending && c.role === "seller" && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onWithdraw} className="ml-auto cursor-pointer text-red-500 hover:bg-red-500/10 hover:text-red-500">
            Withdraw
          </Button>
        )}
        {c.status === "accepted" && (
          <Link href="/orders" className="ml-auto text-sm text-violet-600 hover:underline">
            View order
          </Link>
        )}
      </div>
    </div>
  );
}

/** The live contract card inside a conversation. */
export function ContractCard({ contractId }: { contractId: Id<"contracts"> }) {
  const c = useQuery(api.contracts.get, { contractId });
  const respond = useMutation(api.contracts.respond);
  const cancel = useMutation(api.contracts.cancel);
  const comment = useMutation(api.contracts.comment);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
    } catch (e) {
      toast.error(getErrorMessage(e, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };
  if (c === undefined) return <Skeleton className="h-64 w-full max-w-[460px]" />;
  return (
    <ContractCardView
      c={c}
      busy={busy}
      onAccept={() => run(() => respond({ contractId, accept: true }), "Contract accepted. The order is on its way to the seller.")}
      onReject={() => run(() => respond({ contractId, accept: false }), "Contract rejected")}
      onWithdraw={() => run(() => cancel({ contractId }), "Contract withdrawn")}
      onComment={(body) => run(() => comment({ contractId, body }), "Comment added")}
    />
  );
}

export type ContractFormValues = {
  listingId: string;
  itemTitle: string;
  itemUrl: string;
  total: string;
  count: number;
  first: string;
  frequency: Frequency;
  paymentMethod: string;
  terms: string;
  schedule: Payment[];
};

/** The seller's contract form (state lives outside so it can be previewed). */
export function ContractFormFields({
  values,
  onChange,
  listings,
}: {
  values: ContractFormValues;
  onChange: (next: ContractFormValues) => void;
  listings: { _id: string; title: string; priceCents: number }[];
}) {
  const set = (patch: Partial<ContractFormValues>) => {
    const next = { ...values, ...patch };
    // Changing the amount, number of payments, start or frequency rebuilds the schedule
    if ("total" in patch || "count" in patch || "first" in patch || "frequency" in patch)
      next.schedule = buildSchedule(Math.round(Number(next.total || 0) * 100), next.count, next.first, next.frequency);
    onChange(next);
  };
  const totalCents = Math.round(Number(values.total || 0) * 100);
  const sum = values.schedule.reduce((n, p) => n + p.amountCents, 0);
  const other = values.listingId === "other";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Item or service</Label>
        <Select
          value={values.listingId}
          onValueChange={(id) => {
            const l = listings.find((x) => x._id === id);
            set({ listingId: id, ...(l ? { itemTitle: l.title, total: (l.priceCents / 100).toFixed(2) } : {}) });
          }}
        >
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Pick one of your listings" />
          </SelectTrigger>
          <SelectContent>
            {listings.map((l) => (
              <SelectItem key={l._id} value={l._id} className="cursor-pointer">
                {l.title} · {formatPrice(l.priceCents)}
              </SelectItem>
            ))}
            <SelectItem value="other" className="cursor-pointer">
              Something else (add a link)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {other && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-title">Name</Label>
            <Input id="c-title" value={values.itemTitle} maxLength={120} onChange={(e) => set({ itemTitle: e.target.value })} placeholder="e.g. Custom 3-day wear" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-url">Link to the item or service</Label>
            <Input id="c-url" value={values.itemUrl} maxLength={500} onChange={(e) => set({ itemUrl: e.target.value })} placeholder="https://" />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-total">Total amount (USD)</Label>
          <Input id="c-total" inputMode="decimal" value={values.total} onChange={(e) => set({ total: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0.00" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Number of payments</Label>
          <Select value={String(values.count)} onValueChange={(n) => set({ count: Number(n) })}>
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)} className="cursor-pointer">
                  {n === 1 ? "1 (paid in full)" : `${n} payments`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>How often</Label>
          <Select value={values.frequency} disabled={values.count === 1} onValueChange={(f) => set({ frequency: f as Frequency })}>
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly" className="cursor-pointer">Weekly</SelectItem>
              <SelectItem value="biweekly" className="cursor-pointer">Every 2 weeks</SelectItem>
              <SelectItem value="monthly" className="cursor-pointer">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-first">First payment due</Label>
          <Input id="c-first" type="date" value={values.first} min={isoDay(new Date())} onChange={(e) => set({ first: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-method">Payment method (optional)</Label>
          <Input id="c-method" value={values.paymentMethod} maxLength={80} onChange={(e) => set({ paymentMethod: e.target.value })} placeholder="e.g. Cash App, Venmo, gift card" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Payment schedule</Label>
        <div className="overflow-hidden rounded-[5px] border border-white/10">
          <div className="grid grid-cols-[2.5rem_1fr_8rem] bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wide text-white/70">
            <span>#</span>
            <span>Due date</span>
            <span>Amount</span>
          </div>
          {values.schedule.length === 0 ? (
            <p className="px-3 py-3 text-sm text-white/70">Enter the total and first due date to build the schedule.</p>
          ) : (
            values.schedule.map((p, i) => (
              <div key={i} className="grid grid-cols-[2.5rem_1fr_8rem] items-center gap-2 border-t border-white/10 px-3 py-1.5">
                <span className="text-sm text-violet-600">{i + 1}</span>
                <Input
                  type="date"
                  value={p.dueDate}
                  aria-label={`Payment ${i + 1} due date`}
                  className="h-8"
                  onChange={(e) => onChange({ ...values, schedule: values.schedule.map((x, j) => (j === i ? { ...x, dueDate: e.target.value } : x)) })}
                />
                <Input
                  inputMode="decimal"
                  aria-label={`Payment ${i + 1} amount`}
                  className="h-8"
                  value={p.amountText ?? (p.amountCents / 100).toFixed(2)}
                  onChange={(e) => {
                    const text = e.target.value.replace(/[^0-9.]/g, "");
                    onChange({
                      ...values,
                      schedule: values.schedule.map((x, j) => (j === i ? { ...x, amountText: text, amountCents: Math.round(Number(text || 0) * 100) } : x)),
                    });
                  }}
                />
              </div>
            ))
          )}
        </div>
        {values.schedule.length > 0 && (
          <p className={cn("text-xs", sum === totalCents ? "text-green-500" : "text-red-500")}>
            Payments add up to {usd(sum)} of {usd(totalCents)}
            {sum === totalCents ? " ✓" : ". Adjust the amounts so they match the total."}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-terms">Other terms (optional)</Label>
        <Textarea id="c-terms" value={values.terms} maxLength={2000} rows={3} onChange={(e) => set({ terms: e.target.value })} placeholder="e.g. Item ships after the final payment. Late payments over 7 days cancel the contract." />
      </div>
    </div>
  );
}

export function emptyContract(): ContractFormValues {
  return {
    listingId: "",
    itemTitle: "",
    itemUrl: "",
    total: "",
    count: 1,
    first: isoDay(new Date()),
    frequency: "monthly",
    paymentMethod: "",
    terms: "",
    schedule: [],
  };
}

/** "New contract" popup for the seller in a conversation. */
export function ContractDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: Id<"conversations">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const listings = useQuery(api.contracts.myListings, open ? {} : "skip");
  const create = useMutation(api.contracts.create);
  const [values, setValues] = useState<ContractFormValues>(emptyContract);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!values.listingId) return void toast.error("Pick a listing or choose “Something else”");
    setBusy(true);
    try {
      const other = values.listingId === "other";
      await create({
        conversationId,
        ...(other ? { itemUrl: values.itemUrl.trim() } : { listingId: values.listingId as Id<"listings"> }),
        itemTitle: values.itemTitle.trim(),
        totalCents: Math.round(Number(values.total || 0) * 100),
        paymentMethod: values.paymentMethod.trim() || undefined,
        schedule: values.schedule.map(({ dueDate, amountCents }) => ({ dueDate, amountCents })),
        terms: values.terms.trim() || undefined,
      });
      toast.success("Contract sent");
      setValues(emptyContract());
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't send the contract"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="size-5 text-violet-600" /> New sales contract
            </DialogTitle>
            <DialogDescription>Set the price and payment plan. The buyer can accept, reject or comment on it here in Messages.</DialogDescription>
          </DialogHeader>
          <ContractFormFields values={values} onChange={setValues} listings={listings ?? []} />
          <DialogFooter>
            <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="cursor-pointer bg-violet-600 text-white hover:bg-violet-600">
              {busy ? <Spinner /> : <Send />} Send contract
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

