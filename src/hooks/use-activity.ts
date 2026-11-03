import { useEffect, useRef } from "react";
import { useMutation } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";

/** Counts one visit per profile page load (guarded against StrictMode double effects). */
export function useRecordProfileVisit(userId: Id<"users">) {
  const record = useMutation(api.activity.recordProfileVisit);
  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (counted.current === userId) return;
    counted.current = userId;
    record({ userId }).catch(() => {
      // Visit counting is best effort
    });
  }, [record, userId]);
}

const HEARTBEAT_MS = 2 * 60 * 1000;

/** Keeps the signed-in user's "Online" status fresh while the app is open and visible. */
export function usePresenceHeartbeat() {
  const beat = useMutation(api.activity.heartbeat);
  useEffect(() => {
    const send = () => {
      if (document.visibilityState === "visible") beat({}).catch(() => {});
    };
    send();
    const id = window.setInterval(send, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", send);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", send);
    };
  }, [beat]);
}
