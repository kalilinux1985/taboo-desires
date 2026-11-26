// Sends queued emails (public.email_outbox) through Resend. A schedule calls
// it every minute; it can also be called by hand.
//
//   POST /functions/v1/send-emails
//
// Secrets: RESEND_API_KEY (required).
//   EMAIL_FROM           sender for content-report emails (the report inbox alerts)
//   EMAIL_FROM_REPORTS   same, takes priority over EMAIL_FROM when both are set
//   EMAIL_FROM_GENERAL   sender for every other email (messages, follows, orders);
//                        until it is set they use Resend's test sender, which only
//                        delivers to the Resend account owner
//   EMAIL_REPLY_TO       optional default reply-to
// A sender can be "Name <address>" or just an address.
// SUPABASE_DB_URL is provided by Supabase. The gateway JWT check stays on.

import postgres from "npm:postgres@3.4.5";

const db = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  prepare: false,
  max: 2,
  idle_timeout: 20,
  connect_timeout: 10,
});

const MAX_ATTEMPTS = 5;
const BATCH = 20;

type Row = { id: string; kind: string; to_email: string; reply_to: string | null; subject: string; html: string; text_body: string; attempts: number };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const key = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!key) return new Response("RESEND_API_KEY is not set", { status: 500 });
  const named = (v: string | undefined) => {
    const t = v?.trim();
    return t ? (t.includes("<") ? t : `Taboo Desires <${t}>`) : undefined;
  };
  // Report alerts and "your content is hidden" notices come from the reports address
  const reportsFrom = named(Deno.env.get("EMAIL_FROM_REPORTS")) ?? "Taboo Desires <report.content@taboodesiers.com>";
  const REPORT_KINDS = new Set(["content_report", "content_hidden"]);
  const generalFrom = named(Deno.env.get("EMAIL_FROM_GENERAL")) ?? "Taboo Desires <onboarding@resend.dev>";
  const replyTo = Deno.env.get("EMAIL_REPLY_TO")?.trim();

  // Claim a batch; rows locked by another run are skipped
  const rows = await db.begin(async (tx) => {
    const claimed = await tx<Row[]>`
      select id, kind, to_email, reply_to, subject, html, text_body, attempts
        from public.email_outbox
       where status = 'pending'
       order by created_at
       limit ${BATCH}
       for update skip locked`;
    if (claimed.length)
      await tx`update public.email_outbox set attempts = attempts + 1 where id = any(${claimed.map((r) => r.id)}::uuid[])`;
    return claimed;
  });

  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": r.id,
        },
        body: JSON.stringify({
          from: REPORT_KINDS.has(r.kind) ? reportsFrom : generalFrom,
          to: [r.to_email],
          subject: r.subject,
          html: r.html,
          text: r.text_body,
          ...(r.reply_to || replyTo ? { reply_to: r.reply_to || replyTo } : {}),
        }),
      });
      if (res.ok) {
        await db`update public.email_outbox set status = 'sent', sent_at = now(), last_error = null where id = ${r.id}::uuid`;
        sent++;
      } else {
        const msg = (await res.text()).slice(0, 500);
        // 4xx (bad address, unverified domain) won't fix itself on retry
        const final = (res.status >= 400 && res.status < 500 && res.status !== 429) || r.attempts + 1 >= MAX_ATTEMPTS;
        await db`update public.email_outbox set status = ${final ? "failed" : "pending"}, last_error = ${`${res.status}: ${msg}`} where id = ${r.id}::uuid`;
        failed++;
      }
    } catch (e) {
      const final = r.attempts + 1 >= MAX_ATTEMPTS;
      await db`update public.email_outbox set status = ${final ? "failed" : "pending"}, last_error = ${String(e).slice(0, 500)} where id = ${r.id}::uuid`;
      failed++;
    }
  }
  return Response.json({ sent, failed });
});
