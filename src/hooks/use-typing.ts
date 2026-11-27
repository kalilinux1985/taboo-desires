import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/backend/client.ts";

/** While typing, tell the other person at most this often. */
const SEND_EVERY_MS = 2500;
/** Hide their indicator if no new typing event arrives within this time. */
const SHOW_FOR_MS = 5000;

type TypingPayload = { userId?: string; typing?: boolean };

/**
 * Typing indicator for one conversation. Events go over the private Realtime
 * topic "typing:<conversation id>", which only the buyer and seller can join.
 * Nothing is stored. Pass `enabled = false` when either side has blocked the
 * other: Realtime keeps a joined channel's permissions, so the blocker's
 * client must leave the channel itself to stop sending typing events.
 */
export function useTyping(conversationId: string, meId: string | undefined, enabled = true) {
  const [otherTyping, setOtherTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef(0);

  const send = useCallback(
    (typing: boolean) => {
      const channel = channelRef.current;
      if (!channel || channel.state !== "joined" || !meId) return;
      void channel.send({ type: "broadcast", event: "typing", payload: { userId: meId, typing } });
    },
    [meId],
  );

  useEffect(() => {
    if (!meId || !enabled) return;
    let cancelled = false;
    let hideTimer: number | undefined;
    let channel: RealtimeChannel | null = null;
    void (async () => {
      // Private topics are authorized with the signed-in user's token
      await supabase.realtime.setAuth().catch(() => undefined);
      if (cancelled) return;
      channel = supabase
        .channel(`typing:${conversationId}`, { config: { private: true, broadcast: { self: false } } })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const p = payload as TypingPayload;
          if (!p || p.userId === meId) return;
          window.clearTimeout(hideTimer);
          setOtherTyping(!!p.typing);
          if (p.typing) hideTimer = window.setTimeout(() => setOtherTyping(false), SHOW_FOR_MS);
        })
        .subscribe();
      channelRef.current = channel;
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(hideTimer);
      if (channel) {
        if (lastSentRef.current && channel.state === "joined")
          void channel.send({ type: "broadcast", event: "typing", payload: { userId: meId, typing: false } });
        void supabase.removeChannel(channel);
      }
      channelRef.current = null;
      lastSentRef.current = 0;
      setOtherTyping(false);
    };
  }, [conversationId, meId, enabled]);

  /** Call on every keystroke while the message box has text. */
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < SEND_EVERY_MS) return;
    lastSentRef.current = now;
    send(true);
  }, [send]);

  /** Call when the message is sent or the box is cleared. */
  const notifyStopped = useCallback(() => {
    if (!lastSentRef.current) return;
    lastSentRef.current = 0;
    send(false);
  }, [send]);

  return { otherTyping, notifyTyping, notifyStopped };
}
