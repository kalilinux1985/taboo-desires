import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@/lib/backend/react.tsx";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowLeftRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import { api } from "@/lib/backend/api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { CATEGORY_LABEL, CONDITION_LABEL, formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { STATUS_LABEL, type CustomStatus } from "@/lib/custom-requests.ts";
import { cn } from "@/lib/utils.ts";
import CounterDialog from "./counter-dialog.tsx";

export type CustomRequestRow = FunctionReturnType<typeof api.customRequests.list>["page"][number];
type Role = "buyer" | "seller";
type Action = "accept" | "decline" | "cancel";

const STATUS_STYLE: Record<CustomStatus, string> = {
  pending: "bg-primary text-primary-foreground",
  accepted: "bg-emerald-600 text-white",
  declined: "bg-secondary text-muted-foreground",
  cancelled: "bg-secondary text-muted-foreground",
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function turnText(r: CustomRequestRow, role: Role) {
  if (r.status === "accepted") return `Agreed at ${formatPrice(r.offerCents)}. Arrange payment and delivery in Messages.`;
  if (r.status !== "pending") return null;
  if (!r.myTurn) return "Waiting for their reply";
  return role === "seller" && !countered(r) ? "New request. Accept, decline, or counter." : "They made an offer. Your move.";
}

// A counter-offer always changes the price or attaches a note
const countered = (r: CustomRequestRow) => r.offerCents !== r.budgetCents || r.note !== null;

export default function RequestCard({ request: r, role }: { request: CustomRequestRow; role: Role }) {
  const respond = useMutation(api.customRequests.respond);
  const [busy, setBusy] = useState<Action | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);

  const act = async (action: Action) => {
    setBusy(action);
    try {
      await respond({ requestId: r._id, action });
      toast.success(action === "accept" ? "Offer accepted" : action === "decline" ? "Request declined" : "Request cancelled");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not update the request"));
    } finally {
      setBusy(null);
    }
  };

  const isCountered = countered(r);
  const status = turnText(r, role);

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar name={r.other?.name ?? "?"} url={r.other?.avatarUrl ?? null} className="size-10 text-lg" />
          <div className="min-w-0">
            {r.other ? (
              <Link href={`/seller/${r.other._id}`} className="block truncate font-semibold hover:underline">
                {r.other.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">Deleted user</span>
            )}
            <p className="text-xs text-muted-foreground">
              {role === "buyer" ? "You asked" : "Asked you"} {formatDistanceToNowStrict(r.createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>
        <Badge className={cn("shrink-0", STATUS_STYLE[r.status])}>{STATUS_LABEL[r.status]}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-lg bg-secondary/50 p-3">
        <Detail label="Item" value={CATEGORY_LABEL[r.category]} />
        <Detail label="Wear time" value={CONDITION_LABEL[r.wearTime]} />
        <Detail label="Size" value={r.size} />
      </div>
      <p className="whitespace-pre-line break-words text-sm">{r.details}</p>

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[#1a2238]/45 pt-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {isCountered ? `Budget ${formatPrice(r.budgetCents)} · Current offer` : "Budget"}
          </p>
          <p className="text-2xl font-bold text-violet-300">{formatPrice(r.offerCents)}</p>
          {isCountered && r.note && (
            <p className="max-w-md pt-1 text-sm italic text-muted-foreground">
              {r.lastOfferByMe ? "You" : "They"}: "{r.note}"
            </p>
          )}
          {status && <p className="pt-1 text-xs text-violet-600">{status}</p>}
        </div>

        {r.status === "pending" && (
          <div className="flex flex-wrap gap-2">
            {r.myTurn && (
              <>
                <Button size="sm" variant="ghost" className="cursor-pointer" disabled={!!busy} onClick={() => act("decline")}>
                  {busy === "decline" ? <Spinner /> : <X />} Decline
                </Button>
                <Button size="sm" variant="secondary" className="cursor-pointer" disabled={!!busy} onClick={() => setCounterOpen(true)}>
                  <ArrowLeftRight /> Counter
                </Button>
                <Button size="sm" className="cursor-pointer" disabled={!!busy} onClick={() => act("accept")}>
                  {busy === "accept" ? <Spinner /> : <Check />} Accept {formatPrice(r.offerCents)}
                </Button>
              </>
            )}
            {role === "buyer" && !r.myTurn && (
              <Button size="sm" variant="ghost" className="cursor-pointer" disabled={!!busy} onClick={() => act("cancel")}>
                {busy === "cancel" ? <Spinner /> : <X />} Cancel request
              </Button>
            )}
          </div>
        )}
      </div>
      <CounterDialog requestId={r._id} currentCents={r.offerCents} open={counterOpen} onOpenChange={setCounterOpen} />
    </Card>
  );
}
