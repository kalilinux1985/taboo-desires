// Sends web push notifications. A schedule calls it every minute; it looks for
// new notifications and messages for everyone who turned push on, since the
// last check, and sends each member one short alert per device.
//
//   POST /functions/v1/send-push
//
// Privacy: alerts can show on a locked phone, so they never include names,
// titles, amounts or message text, only what kind of thing happened.
//
// Keys: the VAPID key pair in Supabase Vault ('vapid_keys'), made by the
// backend the first time a member turns push on. Optional secret SITE_URL
// (contact address sent to push services; default the Vercel site).
// SUPABASE_DB_URL is provided by Supabase. The gateway JWT check stays on.
// Deploy as one file: bundle with esbuild (see the build command in the README).

import postgres from "npm:postgres@3.4.5";
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { compile, sql } from "../_shared/core/sql.ts";
import { notificationEventsSql } from "../_shared/lib/notificationEvents.ts";

const db = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  prepare: false,
  max: 2,
  idle_timeout: 20,
  connect_timeout: 10,
});

const MEMBERS_PER_RUN = 500;
const MAX_FAILURES = 10;

type Payload = { title: string; body: string; url: string; tag: string };

/** What each notification says on the lock screen: the kind of event only. */
const SINGLE: Record<string, { body: string; url: string }> = {
  follow: { body: "You have a new follower", url: "/notifications" },
  bid: { body: "New bid on your auction", url: "/notifications" },
  auction_won: { body: "You won an auction", url: "/notifications" },
  custom_request: { body: "You have a new custom request", url: "/customs" },
  custom_answered: { body: "Your custom request got an answer", url: "/customs" },
  unlock_request: { body: "You have a new unlock request", url: "/notifications" },
  unlock_granted: { body: "Your unlock request was approved", url: "/notifications" },
  review: { body: "You got a new review", url: "/notifications" },
  post_like: { body: "Someone liked your post", url: "/notifications" },
  post_comment: { body: "New comment on your post", url: "/notifications" },
  comment_like: { body: "Someone liked your comment", url: "/notifications" },
  contract_sent: { body: "You received a contract", url: "/messages" },
  contract_answered: { body: "Your contract got an answer", url: "/messages" },
  contract_comment: { body: "New comment on a contract", url: "/messages" },
  tracking: { body: "Tracking was added to your order", url: "/orders" },
  message: { body: "You have a new message", url: "/messages" },
};

function payloadFor(events: { kind: string; title: string | null }[]): Payload {
  if (events.length === 1) {
    const [e] = events;
    const base = SINGLE[e.kind] ?? { body: "You have a new notification", url: "/notifications" };
    const body = e.kind === "follow" && e.title === "pending" ? "You have a new follow request" : base.body;
    return { title: "Taboo Desires", body, url: base.url, tag: e.kind === "message" ? "messages" : "notifications" };
  }
  const allMessages = events.every((e) => e.kind === "message");
  return allMessages
    ? { title: "Taboo Desires", body: `You have ${events.length} new messages`, url: "/messages", tag: "messages" }
    : { title: "Taboo Desires", body: `You have ${events.length} new notifications`, url: "/notifications", tag: "notifications" };
}

async function appServer() {
  const [row] = await db`select decrypted_secret from vault.decrypted_secrets where name = 'vapid_keys' limit 1`;
  if (!row) return null;
  const vapidKeys = await webpush.importVapidKeys(JSON.parse(row.decrypted_secret), { extractable: false });
  const contact = (Deno.env.get("SITE_URL")?.trim() || "https://taboo-desires.vercel.app").replace(/\/+$/, "");
  return await webpush.ApplicationServer.new({ contactInformation: contact, vapidKeys });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const server = await appServer();
  if (!server) return Response.json({ members: 0, sent: 0, failed: 0 });

  // Claim members with push on whose last check is old enough. Activity is
  // stamped when its transaction starts, so stop 30 seconds short of now to
  // avoid missing anything that is still being saved.
  const claimed = await db.begin(async (tx) => {
    const [{ until }] = await tx`select now() - interval '30 seconds' as until`;
    const members = await tx<{ id: string; since: Date | null }[]>`
      select u.id, u.push_checked_at as since
        from public.users u
       where exists (select 1 from public.push_subscriptions s where s.user_id = u.id)
         and coalesce(u.push_checked_at, '-infinity'::timestamptz) < ${until}
       order by u.push_checked_at nulls first
       limit ${MEMBERS_PER_RUN}
       for update of u skip locked`;
    if (members.length)
      await tx`update public.users set push_checked_at = ${until} where id = any(${members.map((m) => m.id)}::uuid[])`;
    return { until: until as Date, members };
  });
  const members = claimed.members.filter((m) => m.since);
  if (!members.length) return Response.json({ members: 0, sent: 0, failed: 0 });

  const earliest = new Date(Math.min(...members.map((m) => m.since!.getTime())));
  const query = compile(sql`
    select kind, at, title, recipient_id from (${notificationEventsSql(
      members.map((m) => m.id),
      sql`${earliest.toISOString()}::timestamptz`,
      true,
    )}) n
    where at <= ${claimed.until.toISOString()}::timestamptz`);
  const events = (await db.unsafe(query.text, query.params as string[])) as unknown as {
    kind: string;
    at: Date;
    title: string | null;
    recipient_id: string;
  }[];

  const since = new Map(members.map((m) => [m.id, m.since!.getTime()]));
  const byMember = new Map<string, { kind: string; title: string | null }[]>();
  for (const e of events) {
    if (new Date(e.at).getTime() <= (since.get(e.recipient_id) ?? Infinity)) continue;
    const list = byMember.get(e.recipient_id) ?? [];
    list.push({ kind: e.kind, title: e.title });
    byMember.set(e.recipient_id, list);
  }
  if (!byMember.size) return Response.json({ members: members.length, sent: 0, failed: 0 });

  const subs = await db<{ id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[]>`
    select id, user_id, endpoint, p256dh, auth from public.push_subscriptions
     where user_id = any(${[...byMember.keys()]}::uuid[])`;

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      const payload = payloadFor(byMember.get(s.user_id)!);
      try {
        await server
          .subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })
          .pushTextMessage(JSON.stringify(payload), { ttl: 24 * 3600, urgency: webpush.Urgency.Normal, topic: payload.tag });
        await db`update public.push_subscriptions set last_sent_at = now(), failures = 0 where id = ${s.id}::uuid`;
        sent++;
      } catch (e) {
        failed++;
        const status = e instanceof webpush.PushMessageError ? e.response.status : 0;
        // 404/410: the browser dropped this subscription
        if (status === 404 || status === 410)
          await db`delete from public.push_subscriptions where id = ${s.id}::uuid`;
        else {
          console.error("push failed", status, String(e).slice(0, 300));
          await db`
            with bumped as (update public.push_subscriptions set failures = failures + 1 where id = ${s.id}::uuid returning id, failures)
            delete from public.push_subscriptions p using bumped b where p.id = b.id and b.failures >= ${MAX_FAILURES}`;
        }
      }
    }),
  );
  return Response.json({ members: members.length, sent, failed });
});
