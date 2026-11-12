"use client";

import { useEffect, useRef, type ComponentType } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  Gavel,
  Heart,
  MessageSquare,
  Sparkles,
  Star,
  Trophy,
  Unlock,
  UserPlus,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import { formatPrice } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import RequireAuth from "@/components/require-auth.tsx";
import HideOnError from "@/components/hide-on-error.tsx";

type Notification = NonNullable<FunctionReturnType<typeof api.notifications.list>>[number];
type Icon = ComponentType<{ className?: string }>;

/** Icon, sentence and link for each kind of notification. */
function describe(n: Notification): { icon: Icon; text: string; href: string } {
  const who = n.actor ?? "Someone";
  const money = n.amountCents != null ? formatPrice(n.amountCents) : "";
  switch (n.kind) {
    case "follow":
      return { icon: UserPlus, text: `${who} started following you`, href: n.actorId ? `/seller/${n.actorId}` : "/shop" };
    case "bid":
      return { icon: Gavel, text: `${who} bid ${money} on “${n.title}”`, href: `/listing/${n.targetId}` };
    case "auction_won":
      return { icon: Trophy, text: `You won “${n.title}” for ${money}`, href: `/listing/${n.targetId}` };
    case "custom_request":
      return { icon: Sparkles, text: `${who} sent you a custom request (${money})`, href: "/customs" };
    case "custom_answered":
      return {
        icon: n.title === "accepted" ? Check : X,
        text: `${who} ${n.title} your custom request`,
        href: "/customs?tab=sent",
      };
    case "unlock_request":
      return { icon: Unlock, text: `${who} asked to unlock “${n.title}”`, href: `/listing/${n.targetId}` };
    case "unlock_granted":
      return { icon: Unlock, text: `${who} unlocked “${n.title}” for you`, href: `/listing/${n.targetId}` };
    case "review":
      return { icon: Star, text: `${who} left you a ${n.amountCents}-star review`, href: "/shop" };
    case "post_like":
      return { icon: Heart, text: `${who} liked your post`, href: "/" };
    case "post_comment":
      return { icon: MessageSquare, text: `${who} commented on your post`, href: "/" };
  }
}

function NotificationList() {
  const items = useQuery(api.notifications.list, {});
  const markSeen = useMutation(api.notifications.markSeen);
  const marked = useRef(false);

  // Opening the page clears the bell; the highlight stays until the next visit
  useEffect(() => {
    if (items && !marked.current) {
      marked.current = true;
      void markSeen({}).catch(() => {});
    }
  }, [items, markSeen]);

  if (items === undefined) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Bell />
          </EmptyMedia>
          <EmptyTitle>No notifications yet</EmptyTitle>
          <EmptyDescription>
            New followers, bids, custom requests, reviews and replies from the last 30 days show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-[#1a2238]/45 rounded-[1px] border bg-card shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)]">
      {items.map((n, i) => {
        const { icon: IconComponent, text, href } = describe(n);
        return (
          <li key={`${n.kind}-${n.targetId ?? n.actorId}-${n.at}-${i}`}>
            <Link
              href={href}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/5",
                n.unread && "bg-primary/15",
              )}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/25 text-violet-300">
                <IconComponent className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm">{text}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(n.at, { addSuffix: true })}
                </span>
              </span>
              {n.unread && <span aria-label="New" className="mt-2 size-2 shrink-0 rounded-full bg-rose-500" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function NotificationsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Last 30 days</p>
        <h1 className="font-display text-4xl md:text-6xl">Notifications</h1>
      </header>
      <RequireAuth message="Sign in to see your notifications.">
        <HideOnError
          fallback={
            <p className="text-muted-foreground">
              Notifications aren&apos;t available yet. They&apos;ll appear once the backend is updated.
            </p>
          }
        >
          <NotificationList />
        </HideOnError>
      </RequireAuth>
    </div>
  );
}
