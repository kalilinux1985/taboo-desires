"use client";

import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { format } from "date-fns";
import { motion } from "motion/react";
import { Check, Clock, Crown, Minus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { LOCKED_MEDIA_MAX, PLAN_LIMITS, PRO_PRICE_CENTS } from "@/shared/plans.ts";
import { cn } from "@/lib/utils.ts";
import RequestProDialog from "./_components/request-pro-dialog.tsx";

const FEATURES = [
  { label: "List items for sale", free: false, pro: true },
  { label: "Send and reply to messages", free: false, pro: true },
  { label: "Post on the community board", free: false, pro: true },
  { label: "Profile photos", free: "5", pro: "5" },
  { label: "Zero commission on every sale", free: true, pro: true },
  {
    label: "Photos per listing",
    free: false,
    pro: `${PLAN_LIMITS.pro.maxPhotos}`,
  },
  { label: "Run auctions", free: false, pro: true },
  { label: `Paywalled photo and video listings (up to ${LOCKED_MEDIA_MAX} files)`, free: false, pro: true },
  { label: "Featured on the home page", free: false, pro: true },
] as const;

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="font-mono font-bold">{value}</span>;
  return value ? (
    <Check className="size-4 text-violet-500" />
  ) : (
    <Minus className="size-4 text-muted-foreground/50" />
  );
}

function ProAction() {
  const mine = useQuery(api.subscriptions.mine, {});
  const cancel = useMutation(api.subscriptions.cancelRequest);
  if (mine === undefined) return <Skeleton className="h-10 w-full" />;
  if (mine === null) return null;

  const cancelRequest = async () => {
    try {
      await cancel({});
      toast.success("Request cancelled");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not cancel"));
    }
  };

  if (mine.status === "pending") {
    return (
      <div className="flex w-full flex-col gap-2">
        <p className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          <Clock className="size-4 shrink-0" />
          {mine.plan === "pro" ? "Renewal request is being reviewed" : "Your request is being reviewed"}
        </p>
        <Button variant="ghost" size="sm" onClick={cancelRequest} className="cursor-pointer">
          Cancel request
        </Button>
      </div>
    );
  }
  if (mine.plan === "pro" && mine.expiresAt) {
    return (
      <div className="flex w-full flex-col gap-2">
        <p className="text-center text-sm text-muted-foreground">
          You're Pro until {format(new Date(mine.expiresAt), "MMM d, yyyy")}
        </p>
        <RequestProDialog label="Request a renewal" />
      </div>
    );
  }
  return <RequestProDialog label="Upgrade to Pro" />;
}

function PlanCard({ pro }: { pro: boolean }) {
  return (
    <Card
      className={cn(
        "relative h-full overflow-hidden",
        pro && "border-primary/60 shadow-[0_0_60px_-15px] shadow-primary/50",
      )}
    >
      {pro && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-chart-2 to-primary" />
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-3xl">
            {pro && <Crown className="size-6 text-violet-500" />} {pro ? "Pro" : "Free"}
          </CardTitle>
          {pro && <Badge className="rounded-full">Most popular</Badge>}
        </div>
        <CardDescription>
          {pro ? "For sellers ready to sell." : "Create your seller profile for free."}
        </CardDescription>
        <p className="pt-4">
          <span className="font-display text-5xl">{pro ? formatPrice(PRO_PRICE_CENTS) : "$0"}</span>
          <span className="text-muted-foreground"> / month</span>
        </p>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {FEATURES.map((f) => (
            <li key={f.label} className="flex items-center justify-between gap-4 text-sm">
              <span className={cn(!(pro ? f.pro : f.free) && "text-muted-foreground")}>{f.label}</span>
              <FeatureValue value={pro ? f.pro : f.free} />
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="mt-auto">
        {pro ? (
          <>
            <AuthLoading>
              <Skeleton className="h-10 w-full" />
            </AuthLoading>
            <Unauthenticated>
              <SignInButton className="w-full" />
            </Unauthenticated>
            <Authenticated>
              <ProAction />
            </Authenticated>
          </>
        ) : (
          <p className="w-full text-center text-sm text-muted-foreground">Every seller starts here. Buyers are always free.</p>
        )}
      </CardFooter>
    </Card>
  );
}

export default function PricingPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-4 pb-12 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Seller plans</p>
          <h1 className="font-display text-5xl text-balance md:text-7xl">
            Sell more. <em className="text-violet-400">Keep it all.</em>
          </h1>
          <p className="max-w-xl text-muted-foreground">
            We never take a cut of your sales. Go Pro to run auctions, show off more photos,
            and get featured where buyers look first.
          </p>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-2">
          {[false, true].map((pro, i) => (
            <motion.div
              key={String(pro)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: "easeOut" }}
            >
              <PlanCard pro={pro} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
