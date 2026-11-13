"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { MessageSquareText } from "lucide-react";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import HideOnError from "./hide-on-error.tsx";
import ProfileAvatar from "./profile-avatar.tsx";

/** How many of the latest conversations the dropdown shows. */
const DROPDOWN_COUNT = 6;

/** The latest conversations, unread ones in bold with a dot, for the dropdown. */
function DropdownList({ onPick }: { onPick: () => void }) {
  const convos = useQuery(api.messages.inbox, {});
  if (convos === undefined) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (convos.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">No messages yet.</p>;
  }
  return (
    <ul className="flex max-h-[min(24rem,60vh)] flex-col divide-y divide-white/25 overflow-y-auto">
      {convos.slice(0, DROPDOWN_COUNT).map((c) => (
        <li key={c._id}>
          <Link
            href={`/messages/${c._id}`}
            onClick={onPick}
            className={cn(
              "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5",
              c.unread && "bg-primary/15",
            )}
          >
            <ProfileAvatar name={c.other.name} url={c.other.avatarUrl} className="size-10 rounded-[1px] text-lg" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-baseline justify-between gap-2">
                <span className={cn("truncate text-sm", c.unread ? "font-bold" : "font-medium")}>{c.other.name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(c.lastMessageAt))}
                </span>
              </span>
              <span className="truncate text-xs text-muted-foreground">{c.listing?.title ?? "Direct message"}</span>
              <span className={cn("truncate text-xs", c.unread ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {c.lastFromMe && "You: "}
                {c.lastMessagePreview}
              </span>
            </span>
            {c.unread && <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-rose-500" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Messages button in the header with the number of unread conversations. It
 * opens a dropdown of the latest conversations with "Show all messages" at
 * the bottom. A conversation counts as read once it's opened.
 */
export default function MessagesMenu({ className, badgeClassName }: { className: string; badgeClassName: string }) {
  const [open, setOpen] = useState(false);
  const unread = useQuery(api.messages.unreadCount, {});
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Messages" className={className}>
          <MessageSquareText className="size-5" strokeWidth={1.75} />
          {!!unread && <span className={badgeClassName}>{unread > 9 ? "9+" : unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="flex w-[min(22rem,calc(100vw-1.5rem))] flex-col p-0">
        <p className="border-b border-white/25 px-4 py-3 text-sm font-bold">Messages</p>
        <HideOnError
          fallback={<p className="px-4 py-8 text-center text-sm text-muted-foreground">Messages aren&apos;t available right now.</p>}
        >
          <DropdownList onPick={close} />
        </HideOnError>
        <div className="border-t border-white/25 p-2">
          <Button asChild className="w-full cursor-pointer">
            <Link href="/messages" onClick={close}>
              Show all messages
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
