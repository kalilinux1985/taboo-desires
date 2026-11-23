// Email: mutations queue a row in email_outbox, and the send-emails function
// delivers it through Resend. Queueing happens in the mutation's own
// transaction, so a retried mutation can't send twice (dedupe_key is unique).
// Never call Resend from a mutation.

import type { QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { withDefaults } from "../domain/sellerSettings.ts";

type DenoLike = { env: { get(name: string): string | undefined } };
const SITE_FALLBACK = "https://taboo-desires.vercel.app";

export function siteUrl(): string {
  const deno = (globalThis as { Deno?: DenoLike }).Deno;
  return (deno?.env.get("SITE_URL")?.trim() || SITE_FALLBACK).replace(/\/+$/, "");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain, readable email shell in the site's colors. */
export function renderEmail(opts: { heading: string; lines: string[]; button?: { label: string; path: string }; footer?: string }) {
  const url = opts.button ? `${siteUrl()}${opts.button.path}` : null;
  const html = `<!doctype html><html><body style="margin:0;background:#0C0F15;padding:24px;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#202227;border-radius:5px;padding:28px;">
<tr><td style="color:#ffffff;font-size:20px;font-weight:bold;padding-bottom:12px;">${esc(opts.heading)}</td></tr>
${opts.lines.map((l) => `<tr><td style="color:#ffffff;font-size:14px;line-height:1.6;padding-bottom:10px;">${esc(l)}</td></tr>`).join("")}
${url ? `<tr><td style="padding:12px 0;"><a href="${esc(url)}" style="background:#7c3aed;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:5px;font-size:14px;display:inline-block;">${esc(opts.button!.label)}</a></td></tr>` : ""}
<tr><td style="color:#ffffff;font-size:12px;padding-top:14px;opacity:.7;">${opts.footer ? esc(opts.footer) : `You get this because of your Taboo Desires account. Turn these emails off any time in your settings: ${esc(siteUrl())}/settings`}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [opts.heading, "", ...opts.lines, ...(url ? ["", `${opts.button!.label}: ${url}`] : []), "", opts.footer ?? `Turn these emails off in your settings: ${siteUrl()}/settings`].join("\n");
  return { html, text };
}

export type QueueArgs = {
  to: Pick<Doc<"users">, "_id" | "email" | "settings">;
  /** Reply goes here instead of the default reply-to address */
  replyTo?: string;
  /** Replaces the default footer line */
  footer?: string;
  kind: string;
  subject: string;
  heading: string;
  lines: string[];
  button?: { label: string; path: string };
  /** Same key never sends twice. */
  dedupeKey: string;
  /** Transactional mail (receipts) ignores the member's email-notifications choice. */
  transactional?: boolean;
};

/** Adds an email to the outbox. Skips members with no email or who turned emails off. */
export async function queueEmail(ctx: QueryCtx, a: QueueArgs): Promise<void> {
  if (!a.to.email) return;
  if (!a.transactional && withDefaults(a.to.settings).emailNotifications === "no") return;
  const { html, text } = renderEmail(a);
  await ctx.db.rows(sql`
    insert into public.email_outbox (user_id, to_email, reply_to, kind, subject, html, text_body, dedupe_key)
    values (${a.to._id}::uuid, ${a.to.email}, ${a.replyTo ?? null}, ${a.kind}, ${a.subject.slice(0, 200)}, ${html}, ${text}, ${a.dedupeKey})
    on conflict (dedupe_key) do nothing
  `);
}

/** Queues an email to a plain address (staff mailboxes, not a member). Always sent. */
export async function queueEmailToAddress(
  ctx: QueryCtx,
  a: Omit<QueueArgs, "to" | "transactional"> & { toEmail: string },
): Promise<void> {
  const { html, text } = renderEmail(a);
  await ctx.db.rows(sql`
    insert into public.email_outbox (user_id, to_email, reply_to, kind, subject, html, text_body, dedupe_key)
    values (null, ${a.toEmail}, ${a.replyTo ?? null}, ${a.kind}, ${a.subject.replace(/\s+/g, " ").slice(0, 200)}, ${html}, ${text}, ${a.dedupeKey})
    on conflict (dedupe_key) do nothing
  `);
}

/** Where content reports are emailed. Override with the REPORT_EMAIL_TO secret. */
export function reportInbox(): string {
  const deno = (globalThis as { Deno?: DenoLike }).Deno;
  return deno?.env.get("REPORT_EMAIL_TO")?.trim() || "report.content@taboodesiers.com";
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

/** Dedupe key that allows one email of this kind per member every 6 hours. */
export function throttleKey(ctx: QueryCtx, kind: string, userId: Id<"users">, extra = ""): string {
  return `${kind}:${userId}:${extra}:${Math.floor(ctx.now() / SIX_HOURS)}`;
}
