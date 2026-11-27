// Browser side of web push: register the service worker, ask permission,
// subscribe this device and tell the backend. Push is per device: turning it
// on on a phone doesn't turn it on on a laptop.

import { callBackend, supabase } from "@/lib/backend/client.ts";

export type PushState = "loading" | "unsupported" | "needs-install" | "blocked" | "off" | "on";

const SW_URL = "/sw.js";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** iPhone and iPad only allow push for sites added to the Home Screen. */
export function needsHomeScreen(): boolean {
  if (typeof window === "undefined") return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

async function token(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function call<T>(fn: string, args: unknown): Promise<T> {
  return (await callBackend<T>(fn, args, await token())).value;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  return (await reg?.pushManager.getSubscription()) ?? null;
}

function toBackend(sub: PushSubscription) {
  const json = sub.toJSON();
  return { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" };
}

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64url.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** What this device is set to right now. Also re-sends an existing subscription so the backend has it for the signed-in member. */
export async function readPushState(): Promise<PushState> {
  if (needsHomeScreen()) return "needs-install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const sub = Notification.permission === "granted" ? await currentSubscription() : null;
  if (!sub) return "off";
  await call("push.subscribe", toBackend(sub)).catch(() => undefined);
  return "on";
}

/** Turn push on for this device. Call straight from a tap: browsers only ask permission after one. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  const reg = await navigator.serviceWorker.ready;
  const publicKey = await call<string>("push.publicKey", {});
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  await call("push.subscribe", toBackend(sub));
  return "on";
}

/** Turn push off for this device. */
export async function disablePush(): Promise<PushState> {
  const sub = pushSupported() ? await currentSubscription() : null;
  if (sub) {
    await call("push.unsubscribe", { endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
  }
  return "off";
}
