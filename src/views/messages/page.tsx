"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNowStrict } from "date-fns";
import { MailSearch, MessageSquarePlus, MessagesSquare } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import RequireAuth from "@/components/require-auth.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import ConversationThread from "./_components/conversation-thread.tsx";

function InboxList({ activeId, search }: { activeId?: string; search: string }) {
  const all = useQuery(api.messages.inbox, {});
  const q = search.trim().toLowerCase();
  const convos = all && q ? all.filter((c) => `${c.other.name} ${c.lastMessagePreview} ${c.listing?.title ?? ""}`.toLowerCase().includes(q)) : all;

  if (convos === undefined) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (convos.length === 0) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessagesSquare />
          </EmptyMedia>
          <EmptyTitle>No messages yet</EmptyTitle>
          <EmptyDescription>Ask a seller about an item to start chatting.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm" className="cursor-pointer">
            <Link href="/browse">Browse listings</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-2 px-3 pb-3">
      {convos.map((c) => (
        <li key={c._id}>
          <Link
            href={`/messages/${c._id}`}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-[5px] border border-transparent p-2 transition-colors hover:bg-black/30",
              activeId === c._id && "border-white/10 bg-black/40",
            )}
          >
            <ProfileAvatar name={c.other.name} url={c.other.avatarUrl} className="size-12 rounded-[5px] text-xl" />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-base", c.unread ? "font-bold" : "font-semibold")}>{c.other.name}</p>
              <p className={cn("truncate text-sm", c.unread ? "text-foreground" : "text-muted-foreground")}>
                {c.lastFromMe && "You: "}
                {c.lastMessagePreview}
              </p>
            </div>
            {c.unread && <span className="size-2.5 shrink-0 rounded-full bg-violet-600" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Inbox() {
  const { conversationId } = useParams<{ conversationId: Id<"conversations"> }>();
  const [search, setSearch] = useState("");
  const inbox = useQuery(api.messages.inbox, {});
  const unreadCount = inbox?.filter((c) => c.unread).length ?? 0;
  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-7xl md:px-4 md:py-6">
      <div className="flex min-h-0 flex-1 overflow-hidden border-x md:rounded-[5px] md:border">
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col border-r bg-[#202227] md:w-96",
            conversationId && "hidden md:flex",
          )}
        >
          <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5">
            <h1 className="font-display text-2xl">Active Chats</h1>
            {unreadCount > 0 && (
              <span className="rounded-[5px] bg-violet-600 px-2 py-0.5 text-sm font-semibold text-white">{unreadCount}</span>
            )}
            <Link
              href="/browse"
              aria-label="Start a chat: find a listing to ask about"
              title="Start a chat from a listing"
              className="ml-auto cursor-pointer text-violet-600 hover:text-violet-600"
            >
              <MessageSquarePlus className="size-6" />
            </Link>
          </div>
          <div className="relative p-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for chats"
              className="h-11 rounded-[5px] bg-[#0C0F15] pr-10"
            />
            <MailSearch className="pointer-events-none absolute right-6 top-1/2 size-5 -translate-y-1/2" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <InboxList activeId={conversationId} search={search} />
          </div>
        </aside>
        <section className={cn("min-w-0 flex-1 flex-col bg-[#141519]", conversationId ? "flex" : "hidden md:flex")}>
          {conversationId ? (
            <ConversationThread key={conversationId} conversationId={conversationId} />
          ) : (
            <Empty className="flex-1">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessagesSquare />
                </EmptyMedia>
                <EmptyTitle>Pick a conversation</EmptyTitle>
                <EmptyDescription>Your chats with buyers and sellers show up here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <RequireAuth message="Sign in to see your messages.">
      <Inbox />
    </RequireAuth>
  );
}
