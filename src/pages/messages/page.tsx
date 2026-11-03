import { Link, useParams } from "react-router-dom";
import { useQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNowStrict } from "date-fns";
import { MessagesSquare } from "lucide-react";
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
import { cn } from "@/lib/utils.ts";
import ConversationThread from "./_components/conversation-thread.tsx";

function InboxList({ activeId }: { activeId?: string }) {
  const convos = useQuery(api.messages.inbox, {});

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
            <Link to="/browse">Browse listings</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col">
      {convos.map((c) => (
        <li key={c._id}>
          <Link
            to={`/messages/${c._id}`}
            className={cn(
              "flex cursor-pointer items-center gap-3 border-b px-3 py-3 transition-colors hover:bg-secondary",
              activeId === c._id && "bg-secondary",
            )}
          >
            <div className="size-12 shrink-0 overflow-hidden rounded-sm bg-muted">
              {c.listing?.imageUrl && (
                <img src={c.listing.imageUrl} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={cn("truncate text-sm", c.unread ? "font-bold" : "font-medium")}>
                  {c.other.name}
                </p>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(c.lastMessageAt))}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {c.listing?.title ?? "Listing removed"}
              </p>
              <p className={cn("truncate text-xs", c.unread ? "text-foreground font-semibold" : "text-muted-foreground")}>
                {c.lastFromMe && "You: "}
                {c.lastMessagePreview}
              </p>
            </div>
            {c.unread && <span className="size-2.5 shrink-0 rounded-full bg-accent ring-1 ring-foreground/20" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Inbox() {
  const { conversationId } = useParams<{ conversationId: Id<"conversations"> }>();
  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-7xl md:px-4 md:py-6">
      <div className="flex min-h-0 flex-1 overflow-hidden border-x md:rounded-md md:border">
        <aside
          className={cn(
            "w-full shrink-0 overflow-y-auto border-r md:block md:w-80",
            conversationId && "hidden",
          )}
        >
          <h1 className="border-b px-3 py-4 font-display text-3xl">Messages</h1>
          <InboxList activeId={conversationId} />
        </aside>
        <section className={cn("min-w-0 flex-1 flex-col", conversationId ? "flex" : "hidden md:flex")}>
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
