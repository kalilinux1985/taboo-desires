"use client";

import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { format } from "date-fns";
import { motion } from "motion/react";
import { ArrowRight, Check, CircleCheck, Clock, Lock, Medal } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { useSearchParams } from "@/lib/navigation.ts";
import { useAccess } from "@/hooks/use-access.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { LOCKED_MEDIA_MAX, PLAN_LIMITS, PLAN_OPTIONS, planMonthlyCents, planTotalCents } from "@/shared/plans.ts";
import { cn } from "@/lib/utils.ts";
import RequestProDialog from "./_components/request-pro-dialog.tsx";

/** Why the seller was sent here (?for=list|message|post). */
const REASONS: Record<string, string> = {
  list: "Upgrade to Premium to add listings.",
  message: "Upgrade to Premium to send and reply to messages.",
  post: "Upgrade to Premium to post and comment on the activity feed.",
};

const PERKS = [
  "Keep 100% of your earnings - no commission.",
  "More exposure. More buyers. More sales.",
];

const FEATURES = [
  "List items for sale",
  "Send and reply to messages",
  "Post and comment on the activity feed",
  `Up to ${PLAN_LIMITS.pro.maxPhotos} photos per listing`,
  "Run auctions",
  `Paywalled photo and video listings (up to ${LOCKED_MEDIA_MAX} files)`,
  "Featured on the home page",
  "Zero commission on every sale",
];

const lengthLabel = (months: number) => (months === 1 ? "1 month" : `${months} months`);

/** "$35.98" shown as a big "$35" and a small ".98". */
function BigPrice({ cents }: { cents: number }) {
  const dollars = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return (
    <p className="flex items-baseline justify-center font-display text-violet-600">
      <span className="text-6xl font-bold tracking-tight">${dollars}</span>
      <span className="text-2xl font-bold">.{rest}</span>
    </p>
  );
}

type Mine = ReturnType<typeof useMine>;
function useMine() {
  return useQuery(api.subscriptions.mine, {});
}

/** Go Premium / Pay another way for one plan, or the state of an existing request. */
function PlanActions({ months, mine }: { months: number; mine: Mine | null }) {
  const pending = mine?.status === "pending";
  const goPremium = (
    <Button size="lg" disabled={pending} className="h-11 w-full cursor-pointer rounded-full text-base font-bold">
      Go Premium <ArrowRight />
    </Button>
  );
  const another = (
    <Button
      variant="outline"
      disabled={pending}
      className="h-9 w-full cursor-pointer rounded-full border-[#1a2238]/45 bg-transparent text-sm font-semibold"
    >
      Pay another way <ArrowRight className="size-4" />
    </Button>
  );
  return (
    <>
      {pending ? goPremium : <RequestProDialog months={months} trigger={goPremium} />}
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Subscription</p>
      <div className="h-px bg-[#1a2238]/45" />
      {pending ? another : <RequestProDialog months={months} payAnotherWay trigger={another} />}
    </>
  );
}

function PlanCard({ months, discount, mine }: { months: number; discount: number; mine: Mine | null | undefined }) {
  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-6 text-center shadow-[0_20px_50px_-30px] shadow-primary/60">
      {discount > 0 && (
        <span className="absolute -right-10 top-6 w-36 rotate-45 bg-rose-500 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-white">
          Save {discount}%
        </span>
      )}
      <p className="text-lg font-semibold text-muted-foreground">{lengthLabel(months)}</p>
      <BigPrice cents={planTotalCents(months)} />
      <p className="font-semibold text-muted-foreground">
        ${(planMonthlyCents(months) / 100).toFixed(2)} / month
      </p>
      <div className="h-px bg-[#1a2238]/45" />
      <AuthLoading>
        <Skeleton className="h-11 w-full rounded-full" />
      </AuthLoading>
      <Unauthenticated>
        <SignInButton className="h-11 w-full rounded-full" />
      </Unauthenticated>
      <Authenticated>
        {mine === undefined ? <Skeleton className="h-11 w-full rounded-full" /> : <PlanActions months={months} mine={mine} />}
      </Authenticated>
    </div>
  );
}

/** Pending request or current Premium end date, above the plans. */
function CurrentPlan({ mine }: { mine: Mine | null | undefined }) {
  const cancel = useMutation(api.subscriptions.cancelRequest);
  if (!mine) return null;
  if (mine.status === "pending") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm sm:flex-row sm:justify-between">
        <p className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-violet-600" />
          {mine.plan === "pro" && mine.expiresAt ? "Your renewal request is being reviewed." : "Your Premium request is being reviewed."}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          onClick={() =>
            cancel({})
              .then(() => toast.success("Request cancelled"))
              .catch((e) => toast.error(getErrorMessage(e, "Could not cancel")))
          }
        >
          Cancel request
        </Button>
      </div>
    );
  }
  if (mine.plan === "pro" && mine.expiresAt && Date.parse(mine.expiresAt) > Date.now()) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-center text-sm">
        <CircleCheck className="size-4 text-violet-600" />
        You're Premium until {format(new Date(mine.expiresAt), "MMM d, yyyy")}. Pick a plan below to extend it.
      </p>
    );
  }
  return null;
}

function Plans() {
  const access = useAccess();
  const mine = useQuery(api.subscriptions.mine, access ? {} : "skip");
  if (access && access.accountType === "buyer" && !access.isAdmin) {
    return (
      <p className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        Premium is for sellers. Buyer accounts are always free.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <CurrentPlan mine={mine} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_OPTIONS.map((p, i) => (
          <motion.div
            key={p.months}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: "easeOut" }}
          >
            <PlanCard months={p.months} discount={p.discountPercent} mine={mine} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [params] = useSearchParams();
  const reason = REASONS[params.get("for") ?? ""];

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      {reason && (
        <p className="relative flex items-center justify-center gap-2 bg-primary/25 px-4 py-2.5 text-center text-sm font-semibold">
          <Lock className="size-4 shrink-0 text-violet-300" /> {reason}
        </p>
      )}
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:py-16">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-3 border-b pb-8 text-center"
        >
          <h1 className="flex flex-wrap items-center justify-center gap-x-3 font-display text-4xl text-balance md:text-6xl">
            <Medal className="size-10 text-rose-400 md:size-12" /> Become Premium &amp; start making money!
          </h1>
          <p className="text-lg font-semibold text-violet-600">One sale can cover your whole plan.</p>
        </motion.header>

        <ul className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2 rounded-lg border bg-card/60 px-5 py-5 text-center">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <CircleCheck className="size-4 shrink-0 text-violet-600" /> {p}
            </li>
          ))}
          <li className="flex items-center gap-2 font-bold">
            <CircleCheck className="size-4 shrink-0 text-violet-600" /> Save up to 50% with longer plans!
          </li>
        </ul>

        <Plans />

        <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-6">
          <h2 className="text-center font-display text-3xl md:text-4xl">What you get with Premium</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-violet-600" /> {f}
              </li>
            ))}
          </ul>
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
            <p className="pb-1 font-semibold text-foreground">How does Premium work?</p>
            Pick a plan and send your request. Our team reviews it and switches Premium on for
            your shop, usually within a day. Your plan starts once it's approved, and choosing
            a plan while you're already Premium adds the time on to your current end date.
          </div>
        </section>
      </div>
    </div>
  );
}
