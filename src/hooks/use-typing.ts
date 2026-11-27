"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/backend/client.ts";

/** How long "typing…" stays up without a fresh signal */
const SHOW_MS = 6000;
/** Resend "still typing" at most this often */
const RESEND_MS = 2500;

/**
 * Typing indicator for one conversation, over a private Realtime channel the
 * database only lets the two people in the conversation join. Nothing is
 * stored. `enabled` is false when either person has read receipts off.
 */
export function useTyping(conversationId: string, enabled: boolean) {
  const [otherTyping, setOtherTyping] = useState(false);
  const channel = useRef<RealtimeChannel | null>(null);
  const sentTyping = useRef(false);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setOtherTyping(false);
      return;
    }
    let hide: ReturnType<typeof setTimeout> | undefined;
    const ch = supabase.channel(`typing:${conversationId}`, { config: { private: true, broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      clearTimeout(hide);
      if ((payload as { typing?: unknown })?.typing === true) {
        setOtherTyping(true);
        hide = setTimeout(() => setOtherTyping(false), SHOW_MS);
      } else setOtherTyping(false);
    });
    let live = true;
    void supabase.realtime.setAuth().finally(() => {
      if (live) ch.subscribe();
    });
    channel.current = ch;
    return () => {
      live = false;
      clearTimeout(hide);
      if (sentTyping.current) void ch.send({ type: "broadcast", event: "typing", payload: { typing: false } });
      sentTyping.current = false;
      channel.current = null;
      setOtherTyping(false);
      void supabase.removeChannel(ch);
    };
  }, [conversationId, enabled]);

  /** Tell the other person I'm typing (true) or stopped (false). Cheap to call on every keystroke. */
  const notify = useCallback((typing: boolean) => {
    const ch = channel.current;
    if (!ch) return;
    const now = Date.now();
    if (typing && sentTyping.current && now - lastSent.current < RESEND_MS) return;
    if (!typing && !sentTyping.current) return;
    sentTyping.current = typing;
    lastSent.current = now;
    void ch.send({ type: "broadcast", event: "typing", payload: { typing } });
  }, []);

  return { otherTyping, notify };
}
