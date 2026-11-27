import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
import { format, formatDistanceToNow, isSameDay, isToday } from "date-fns";
import { ArrowLeft, EllipsisVertical, FileSignature, Send } from "lucide-react";
import { ContractCard, ContractDialog } from "./contract.tsx";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { useAccess } from "@/hooks/use-access.ts";
import { useUpgradeGate } from "@/hooks/use-upgrade-gate.ts";
import { deniedMessage } from "@/shared/accounts.ts";
import UpgradeNotice from "@/components/upgrade-notice.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { useTyping } from "@/hooks/use-typing.ts";

function formatTime(ms: number) {
  return isToday(ms) ? format(ms, "h:mm a") : format(ms, "MMM d, h:mm a");
}

/** After this long without a keystroke, tell the other person I stopped typing */
const IDLE_MS = 4000;

function Composer({
  conversationId,
  isSeller,
  onTyping,
}: {
  conversationId: Id<"conversations">;
  isSeller: boolean;
  onTyping: (typing: boolean) => void;
}) {
  const [contractOpen, setContractOpen] = useState(false);
  const access = useAccess();
  const { blockAndRedirect } = useUpgradeGate();
  const send = useMutation(api.messages.send);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(idle.current), []);

  const changeBody = (text: string) => {
    setBody(text);
    clearTimeout(idle.current);
    if (!text.trim()) return onTyping(false);
    onTyping(true);
    idle.current = setTimeout(() => onTyping(false), IDLE_MS);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    if (blockAndRedirect("message")) return;
    setSending(true);
    clearTimeout(idle.current);
    onTyping(false);
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
    <form onSubmit={submit} className="flex items-center gap-3 border-t border-white/5 bg-[#141519] p-4">
      {isSeller && (
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setContractOpen(true)}
            aria-label="Send a contract"
            title="Send a contract"
            className="h-11 shrink-0 cursor-pointer gap-1.5 rounded-[5px] border border-violet-600/60 px-3 text-white hover:bg-violet-600/20"
          >
            <FileSignature className="size-5 text-violet-600" /> <span className="hidden sm:inline">Contract</span>
          </Button>
          <ContractDialog conversationId={conversationId} open={contractOpen} onOpenChange={setContractOpen} />
        </>
      )}
      <Textarea
        value={body}
        onChange={(e) => changeBody(e.target.value)}
        onBlur={() => onTyping(false)}
        onKeyDown={onKeyDown}
        maxLength={2000}
        rows={1}
        placeholder="Type a message"
        className="max-h-32 min-h-11 resize-none rounded-[5px] bg-[#0C0F15]"
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={!body.trim() || sending}
        className="size-11 shrink-0 cursor-pointer text-violet-600 hover:bg-transparent hover:text-violet-600"
        aria-label="Send message"
      >
        {sending ? <Spinner /> : <Send className="size-6" />}
      </Button>
    </form>
  );
}

function TypingBubble({ other }: { other: { name: string; avatarUrl: string | null } }) {
  return (
    <div className="flex max-w-[80%] items-start gap-2 self-start" aria-live="polite">
      <ProfileAvatar name={other.name} url={other.avatarUrl} className="mt-0.5 size-9 rounded-[5px] text-sm" />
      <div className="flex items-center gap-1 rounded-[5px] bg-[#202227] px-4 py-3" aria-label={`${other.name} is typing`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 animate-bounce rounded-full bg-violet-600"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageList({
  conversationId,
  meId,
  other,
  otherReadAt,
  otherTyping,
}: {
  conversationId: Id<"conversations">;
  meId: Id<"users">;
  /** The other person, shown beside their messages */
  other: { name: string; avatarUrl: string | null };
  /** When the other person last read the conversation; null when receipts are off */
  otherReadAt: string | null;
  otherTyping: boolean;
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
      {otherTyping && <TypingBubble other={other} />}
      {results.map((m, i) => {
        const mine = m.senderId === meId;
        // Receipt under the newest message, when it's mine
        const receipt =
          i === 0 && mine && otherReadAt !== null
            ? Date.parse(otherReadAt) >= m._creationTime
              ? `Seen ${formatTime(Date.parse(otherReadAt))}`
              : "Sent"
            : null;
        // A contract's card shows once, on the message that sent it; later replies about it stay text
        const contractCard = m.contractId && !results.slice(i + 1).some((x) => x.contractId === m.contractId);
        const older = results[i + 1];
        const newDay = !older || !isSameDay(older._creationTime, m._creationTime);
        const bubble = (
          <div className={cn("flex min-w-0 flex-col gap-1", mine ? "items-end" : "items-start")}>
            <div
              className={cn(
                "whitespace-pre-wrap break-words rounded-[5px] border px-4 py-2 text-base",
                mine ? "border-white/10 bg-[#0C0F15] text-foreground" : "border-transparent bg-[#202227] text-foreground/90",
              )}
            >
              {m.body}
            </div>
            {contractCard && m.contractId && <ContractCard contractId={m.contractId} />}
            <span className="px-1 text-xs text-violet-600">
              {format(m._creationTime, "h:mm a")}
              {receipt && <span className="text-muted-foreground"> · {receipt}</span>}
            </span>
          </div>
        );
        return (
          <div key={m._id} className="flex flex-col-reverse gap-2">
            {mine ? (
              <div className="flex max-w-[80%] self-end">{bubble}</div>
            ) : (
              <div className="flex max-w-[80%] items-start gap-2 self-start">
                <ProfileAvatar name={other.name} url={other.avatarUrl} className="mt-0.5 size-9 rounded-[5px] text-sm" />
                {bubble}
              </div>
            )}
            {newDay && (
              <p className="py-2 text-center text-sm text-violet-600">{format(m._creationTime, "MMM d, yyyy h:mm a")}</p>
            )}
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

  // Mark read while this thread is open and actually on screen, so a read
  // receipt never claims a message was seen from a background tab
  const unread = convo?.unread ?? false;
  useEffect(() => {
    if (!unread) return;
    const mark = () => {
      if (document.visibilityState === "visible") void markRead({ conversationId }).catch(() => undefined);
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [unread, conversationId, markRead]);

  const { otherTyping, notify } = useTyping(conversationId, convo?.typing ?? false);

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
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
        <Button asChild variant="ghost" size="icon-sm" className="cursor-pointer md:hidden">
          <Link href="/messages" aria-label="Back to inbox">
            <ArrowLeft />
          </Link>
        </Button>
        <ProfileAvatar name={convo.other.name} url={convo.other.avatarUrl} className="size-12 rounded-[5px] text-xl" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-lg font-bold">{convo.other.name}</p>
          <p className={cn("truncate text-sm", otherTyping ? "text-violet-600" : "text-muted-foreground")}>
            {otherTyping
              ? "Typing…"
              : convo.otherLastSeenAt
              ? `Last active ${formatDistanceToNow(Date.parse(convo.otherLastSeenAt), { addSuffix: true })}`
              : convo.listing
                ? convo.listing.title
                : "Direct message"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Conversation options" className="cursor-pointer text-violet-600">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {convo.other._id && (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/seller/${convo.other._id}`}>View profile</Link>
              </DropdownMenuItem>
            )}
            {convo.listing && (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/listing/${convo.listing._id}`}>
                  View listing · {convo.listing.title} · {formatPrice(convo.listing.priceCents)}
                  {convo.listing.status === "sold" ? " (sold)" : ""}
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <MessageList
        conversationId={conversationId}
        meId={convo.meId}
        other={convo.other}
        otherReadAt={convo.otherReadAt}
        otherTyping={otherTyping}
      />
      <Composer conversationId={conversationId} isSeller={convo.role === "seller"} onTyping={notify} />
    </div>
  );
}
