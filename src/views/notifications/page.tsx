"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { describeNotification as describe } from "@/lib/notifications.ts";
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
    <ul className="flex flex-col divide-y divide-white/25 rounded-[1px] border bg-card shadow-[0_14px_34px_-8px_rgba(0,0,0,0.3)]">
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
