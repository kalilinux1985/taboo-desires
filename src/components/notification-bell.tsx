"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { describeNotification } from "@/lib/notifications.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { cn } from "@/lib/utils.ts";
import HideOnError from "./hide-on-error.tsx";
import ProfileAvatar from "./profile-avatar.tsx";

/** How many of the newest notifications the dropdown shows. */
const DROPDOWN_COUNT = 6;

function NewCount() {
  const count = useQuery(api.notifications.unreadCount, {});
  return count ? <span className="font-display text-sm text-violet-500">{count} new</span> : null;
}

function CountBadge() {
  const count = useQuery(api.notifications.unreadCount, {});
  if (!count) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Accept / Delete for a follow request */
function RequestActions({ followerId }: { followerId: Id<"users"> }) {
  const respond = useMutation(api.follows.respond);
  const [done, setDone] = useState<"accepted" | "deleted" | null>(null);
  const answer = async (accept: boolean) => {
    try {
      await respond({ followerId, accept });
      setDone(accept ? "accepted" : "deleted");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not answer the request"));
    }
  };
  if (done) return <span className="mt-2 block text-sm text-muted-foreground">{done === "accepted" ? "Accepted" : "Deleted"}</span>;
  return (
    <span className="mt-2 flex gap-6 font-display text-base">
      <button type="button" onClick={() => void answer(true)} className="cursor-pointer text-violet-500 hover:text-violet-400">
        Accept
      </button>
      <button type="button" onClick={() => void answer(false)} className="cursor-pointer text-red-600 hover:text-red-500">
        Delete
      </button>
    </span>
  );
}

/** "Just now", "5m", "1hr", "3d" */
function shortAgo(ms: number) {
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr`;
  return `${Math.floor(hrs / 24)}d`;
}

/** The newest notifications, new ones on a lighter card, for the dropdown. */
function DropdownList({ onPick }: { onPick: () => void }) {
  const items = useQuery(api.notifications.list, {});
  const me = useQuery(api.users.menu, {});
  if (items === undefined) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (!items || items.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>;
  }
  return (
    <ul className="flex max-h-[min(26rem,60vh)] flex-col gap-2 overflow-y-auto p-3">
      {items.slice(0, DROPDOWN_COUNT).map((n, i) => {
        const { text, href } = describeNotification(n, me?._id);
        const who = n.actor ?? "Someone";
        const rest = text.startsWith(who) ? text.slice(who.length) : ` ${text}`;
        const isRequest = n.kind === "follow" && n.title === "pending" && n.actorId;
        const rowClass = cn("flex items-start gap-3 rounded-[2px] p-3 transition-colors", n.unread && "bg-[#202227]");
        const body = (
          <>
            <ProfileAvatar name={who} url={n.actorAvatarUrl} className="size-12 rounded-[2px] text-xl" />
            <span className="min-w-0 flex-1 text-base leading-snug">
              <span className="font-bold">{who}</span>
              {rest}
              {isRequest && n.actorId && <RequestActions followerId={n.actorId} />}
            </span>
            <span className="shrink-0 text-xs text-violet-500">{shortAgo(n.at)}</span>
          </>
        );
        return (
          <li key={`${n.kind}-${n.targetId ?? n.actorId}-${n.at}-${i}`}>
            {isRequest ? (
              <div className={rowClass}>{body}</div>
            ) : (
              <Link href={href} onClick={onPick} className={cn(rowClass, "hover:bg-[#202227]")}>
                {body}
              </Link>
            )}
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
      <PopoverContent align="end" sideOffset={8} className="flex w-[min(24rem,calc(100vw-1.5rem))] flex-col rounded-[2px] border-white/10 bg-[#09090be6] p-0">
        <div className="flex items-baseline gap-3 border-b border-white/10 px-4 py-4">
          <p className="font-display text-xl">Notifications</p>
          <HideOnError>
            <NewCount />
          </HideOnError>
          <button
            type="button"
            onClick={() => void markSeen({}).catch(() => {})}
            className="ml-auto cursor-pointer font-display text-sm text-violet-500 hover:text-violet-400"
          >
            Clear all
          </button>
        </div>
        <HideOnError
          fallback={<p className="px-4 py-8 text-center text-sm text-muted-foreground">Notifications aren&apos;t available yet.</p>}
        >
          <DropdownList onPick={() => onOpenChange(false)} />
        </HideOnError>
        <Link
          href="/notifications"
          onClick={() => onOpenChange(false)}
          className="cursor-pointer border-t border-white/10 py-4 text-center font-display text-xl text-violet-500 hover:text-violet-400"
        >
          View All Notifications
        </Link>
      </PopoverContent>
    </Popover>
  );
}
