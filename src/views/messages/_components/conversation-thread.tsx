import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
import { format, isToday } from "date-fns";
import { ArrowLeft, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { useAccess } from "@/hooks/use-access.ts";
import { useUpgradeGate } from "@/hooks/use-upgrade-gate.ts";
import { deniedMessage } from "@/shared/accounts.ts";
import UpgradeNotice from "@/components/upgrade-notice.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";

function formatTime(ms: number) {
  return isToday(ms) ? format(ms, "h:mm a") : format(ms, "MMM d, h:mm a");
}

function Composer({ conversationId }: { conversationId: Id<"conversations"> }) {
  const access = useAccess();
  const { blockAndRedirect } = useUpgradeGate();
  const send = useMutation(api.messages.send);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    if (blockAndRedirect("message")) return;
    setSending(true);
    try {
      await send({ conversationId, body: text });
      setBody("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Message failed to send"));
    } finally {
      setSending(false);
    }
  };

  // Enter sends, Shift+Enter adds a new line
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  if (access && !access.can.message && access.accountType !== "seller") {
    return (
      <div className="border-t bg-card p-3">
        <UpgradeNotice message={deniedMessage("message", access.accountType ?? undefined, access.ageVerified)} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t bg-card p-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={2000}
        rows={1}
        placeholder="Write a message..."
        className="max-h-32 min-h-10 resize-none"
      />
      <Button
        type="submit"
        size="icon"
        disabled={!body.trim() || sending}
        className="size-10 shrink-0 cursor-pointer"
        aria-label="Send message"
      >
        {sending ? <Spinner /> : <SendHorizontal />}
      </Button>
    </form>
  );
}

function MessageList({
  conversationId,
  meId,
  other,
}: {
  conversationId: Id<"conversations">;
  meId: Id<"users">;
  /** The other person, shown beside their messages */
  other: { name: string; avatarUrl: string | null };
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.listMessages,
    { conversationId },
    { initialNumItems: 40 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-1 flex-col justify-end gap-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-10 w-1/2", i % 2 && "self-end")} />
        ))}
      </div>
    );
  }

  return (
    // column-reverse keeps the view pinned to the newest message
    <div className="flex min-h-0 flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
      {results.map((m) => {
        const mine = m.senderId === meId;
        const bubble = (
          <div className={cn("flex min-w-0 flex-col gap-1", mine ? "items-end" : "items-start")}>
            <div
              className={cn(
                "whitespace-pre-wrap break-words rounded-[1px] px-3 py-2 text-sm",
                mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              {m.body}
            </div>
            <span className="px-1 text-[10px] text-muted-foreground">
              {formatTime(m._creationTime)}
            </span>
          </div>
        );
        return mine ? (
          <div key={m._id} className="flex max-w-[80%] self-end">
            {bubble}
          </div>
        ) : (
          <div key={m._id} className="flex max-w-[80%] items-start gap-2 self-start">
            <ProfileAvatar name={other.name} url={other.avatarUrl} className="mt-0.5 size-7 rounded-[1px] text-xs" />
            {bubble}
          </div>
        );
      })}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer self-center"
          disabled={status === "LoadingMore"}
          onClick={() => loadMore(40)}
        >
          {status === "LoadingMore" && <Spinner />} Load earlier messages
        </Button>
      )}
    </div>
  );
}

export default function ConversationThread({
  conversationId,
}: {
  conversationId: Id<"conversations">;
}) {
  const convo = useQuery(api.messages.getConversation, { conversationId });
  const markRead = useMutation(api.messages.markRead);

  // Mark read whenever this thread is open and has unread messages (syncs server state)
  const unread = convo?.unread ?? false;
  useEffect(() => {
    if (unread) void markRead({ conversationId }).catch(() => undefined);
  }, [unread, conversationId, markRead]);

  if (convo === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b p-3">
        <Button asChild variant="ghost" size="icon-sm" className="cursor-pointer md:hidden">
          <Link href="/messages" aria-label="Back to inbox">
            <ArrowLeft />
          </Link>
        </Button>
        {/* Who you're talking to, then the listing it's about */}
        {convo.other._id ? (
          <Link href={`/seller/${convo.other._id}`} className="flex shrink-0 cursor-pointer items-center gap-2.5">
            <ProfileAvatar name={convo.other.name} url={convo.other.avatarUrl} className="size-11 rounded-[1px] text-lg" />
          </Link>
        ) : (
          <ProfileAvatar name={convo.other.name} url={convo.other.avatarUrl} className="size-11 rounded-[1px] text-lg" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate font-semibold">
            {convo.other._id ? (
              <Link href={`/seller/${convo.other._id}`} className="cursor-pointer hover:underline">
                {convo.other.name}
              </Link>
            ) : (
              convo.other.name
            )}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({convo.role === "buyer" ? "seller" : "buyer"})
            </span>
          </p>
          {convo.listing ? (
            <Link
              href={`/listing/${convo.listing._id}`}
              className="flex min-w-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="truncate">{convo.listing.title}</span>
              <span className="shrink-0 font-mono">{formatPrice(convo.listing.priceCents)}</span>
              {convo.listing.status === "sold" && <Badge variant="destructive">Sold</Badge>}
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">Direct message</p>
          )}
        </div>
        {convo.listing?.imageUrl && (
          <Link href={`/listing/${convo.listing._id}`} className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-[1px] bg-muted">
            <img src={convo.listing.imageUrl} alt="" className="size-full object-cover" />
          </Link>
        )}
      </div>
      <MessageList conversationId={conversationId} meId={convo.meId} other={convo.other} />
      <Composer conversationId={conversationId} />
    </div>
  );
}
