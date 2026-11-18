// EasyPost webhook: keeps order tracking up to date by itself.
//
//   POST /functions/v1/easypost-webhook   (EasyPost → Settings → Webhooks)
//
// The request body is not trusted: it only says which tracker changed. The
// function fetches that tracker from EasyPost with the API key and applies
// what EasyPost itself reports, so no webhook secret is needed and a forged
// request can't change an order.
//
// Secrets: EASYPOST_API_KEY (same as the api function). SUPABASE_DB_URL is
// provided by Supabase. Deployed with verify_jwt off (EasyPost sends no JWT).

import postgres from "npm:postgres@3.4.5";

const IN_TRANSIT = [
  "in_transit",
  "out_for_delivery",
  "available_for_pickup",
  "return_to_sender",
  "failure",
];

const db = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  prepare: false,
  max: 2,
  idle_timeout: 20,
  connect_timeout: 10,
});

type Tracker = { id: string; tracking_code: string; status?: string; public_url?: string };

async function fetchTracker(id: string): Promise<Tracker | null> {
  const key = Deno.env.get("EASYPOST_API_KEY")?.trim();
  if (!key) throw new Error("EASYPOST_API_KEY is not set");
  const res = await fetch(`https://api.easypost.com/v2/trackers/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Basic ${btoa(`${key}:`)}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`EasyPost tracker lookup failed: ${res.status}`);
  return (await res.json()) as Tracker;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  let event: { description?: string; result?: { object?: string; id?: string } };
  try {
    event = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const trackerId = event.result?.object === "Tracker" ? event.result.id : undefined;
  // Acknowledge everything else so EasyPost doesn't keep retrying it
  if (!trackerId || !/^trk_[A-Za-z0-9]+$/.test(trackerId))
    return new Response("ignored", { status: 200 });

  try {
    const tracker = await fetchTracker(trackerId);
    if (!tracker?.status || !tracker.tracking_code) return new Response("ignored", { status: 200 });
    const status = tracker.status.slice(0, 40);
    const url = tracker.public_url?.slice(0, 500) ?? null;
    const s = status;
    const moving = db.array(IN_TRANSIT);
    const updated = await db`
      update public.orders set
        tracking_status = ${s}::text,
        tracking_url = coalesce(${url}::text, tracking_url),
        status = case
          when ${s}::text = 'delivered' then 'delivered'
          when ${s}::text = any(${moving}::text[]) and status = 'label_created' then 'shipped'
          else status end,
        shipped_at = case
          when shipped_at is null and (${s}::text = 'delivered' or ${s}::text = any(${moving}::text[])) then now()
          else shipped_at end,
        delivered_at = case when ${s}::text = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
        updated_at = now()
      where tracking_code = ${tracker.tracking_code}::text
        and status in ('label_created', 'shipped')
      returning id`;
    return new Response(JSON.stringify({ updated: updated.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    // 500 makes EasyPost retry later
    return new Response("error", { status: 500 });
  }
});
