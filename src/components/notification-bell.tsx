"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import HideOnError from "./hide-on-error.tsx";

function CountBadge() {
  const count = useQuery(api.notifications.unreadCount, {});
  if (!count) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Bell in the header with the number of new notifications. */
export default function NotificationBell({
  href = "/notifications",
  className,
}: {
  href?: string;
  /** Replaces the default ghost button look */
  className?: string;
}) {
  if (className) {
    return (
      <Link href={href} aria-label="Notifications" className={cn(className)}>
        <Bell className="size-5" strokeWidth={1.75} />
        {href === "/notifications" && (
          <HideOnError>
            <CountBadge />
          </HideOnError>
        )}
      </Link>
    );
  }
  return (
    <Button asChild size="icon" variant="ghost" className="relative cursor-pointer">
      <Link href={href} aria-label="Notifications">
        <Bell className="size-5" />
        {href === "/notifications" && (
          <HideOnError>
            <CountBadge />
          </HideOnError>
        )}
      </Link>
    </Button>
  );
}
