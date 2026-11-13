"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { describeNotification } from "@/lib/notifications.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { cn } from "@/lib/utils.ts";
import HideOnError from "./hide-on-error.tsx";

/** How many of the newest notifications the dropdown shows. */
const DROPDOWN_COUNT = 6;

function CountBadge() {
  const count = useQuery(api.notifications.unreadCount, {});
  if (!count) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** The newest notifications, new ones highlighted, for the dropdown. */
function DropdownList({ onPick }: { onPick: () => void }) {
  const items = useQuery(api.notifications.list, {});
  if (items === undefined) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (!items || items.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>;
  }
  return (
    <ul className="flex max-h-[min(24rem,60vh)] flex-col divide-y divide-white/25 overflow-y-auto">
      {items.slice(0, DROPDOWN_COUNT).map((n, i) => {
        const { icon: Icon, text, href } = describeNotification(n);
        return (
          <li key={`${n.kind}-${n.targetId ?? n.actorId}-${n.at}-${i}`}>
            <Link
              href={href}
              onClick={onPick}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/5",
                n.unread && "bg-primary/15",
              )}
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/25 text-violet-600">
                <Icon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm leading-snug">{text}</span>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(n.at, { addSuffix: true })}</span>
              </span>
              {n.unread && <span aria-label="New" className="mt-2 size-2 shrink-0 rounded-full bg-rose-500" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Bell in the header with the number of new notifications. Signed in, it opens
 * a dropdown of the newest notifications with "Show all notifications" at the
 * bottom; closing the dropdown clears the count. Signed out, it links to sign-in.
 */
export default function NotificationBell({
  href = "/notifications",
  className,
}: {
  href?: string;
  /** Replaces the default ghost button look */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const markSeen = useMutation(api.notifications.markSeen);
  const signedIn = href === "/notifications";

  const icon = <Bell className="size-5" strokeWidth={className ? 1.75 : undefined} />;
  const triggerClass = className ? cn(className) : "relative cursor-pointer";

  if (!signedIn) {
    return className ? (
      <Link href={href} aria-label="Notifications" className={triggerClass}>
        {icon}
      </Link>
    ) : (
      <Button asChild size="icon" variant="ghost" className={triggerClass}>
        <Link href={href} aria-label="Notifications">
          {icon}
        </Link>
      </Button>
    );
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    // New ones stay highlighted while the dropdown is open, then count as seen
    if (!next) void markSeen({}).catch(() => {});
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {className ? (
          <button type="button" aria-label="Notifications" className={cn(triggerClass, "cursor-pointer")}>
            {icon}
            <HideOnError>
              <CountBadge />
            </HideOnError>
          </button>
        ) : (
          <Button size="icon" variant="ghost" aria-label="Notifications" className={triggerClass}>
            {icon}
            <HideOnError>
              <CountBadge />
            </HideOnError>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="flex w-[min(22rem,calc(100vw-1.5rem))] flex-col p-0">
        <p className="border-b border-white/25 px-4 py-3 text-sm font-bold">Notifications</p>
        <HideOnError
          fallback={<p className="px-4 py-8 text-center text-sm text-muted-foreground">Notifications aren&apos;t available yet.</p>}
        >
          <DropdownList onPick={() => onOpenChange(false)} />
        </HideOnError>
        <div className="border-t border-white/25 p-2">
          <Button asChild className="w-full cursor-pointer">
            <Link href="/notifications" onClick={() => onOpenChange(false)}>
              Show all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
