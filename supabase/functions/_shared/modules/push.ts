// Web push notifications: the browser asks for the site's public key, turns
// notifications on for that device, and sends us its push address. The
// send-push function (supabase/functions/send-push) does the sending.

import { AppError } from "../core/errors.ts";
import { mutation, type QueryCtx } from "../core/functions.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import { requireUser } from "../lib/auth.ts";

const VAULT_NAME = "vapid_keys";
const MAX_DEVICES = 10;

const b64urlToBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const bytesToB64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

type VapidJwks = { publicKey: JsonWebKey; privateKey: JsonWebKey };

/** The site's push key pair, kept in Supabase Vault; made the first time it's needed. */
async function vapidKeys(ctx: QueryCtx): Promise<VapidJwks> {
  const [row] = await ctx.db.rows(sql`select decrypted_secret from vault.decrypted_secrets where name = ${VAULT_NAME} limit 1`);
  if (row?.decrypted_secret) return JSON.parse(String(row.decrypted_secret)) as VapidJwks;
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const keys: VapidJwks = {
    publicKey: await crypto.subtle.exportKey("jwk", pair.publicKey),
    privateKey: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
  await ctx.db.rows(sql`select vault.create_secret(${JSON.stringify(keys)}, ${VAULT_NAME}, 'Web push (VAPID) key pair')`);
  return keys;
}

/** The public key browsers need to turn on push (the "application server key"). */
export const publicKey = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const { publicKey: jwk } = await vapidKeys(ctx);
    const x = b64urlToBytes(jwk.x!);
    const y = b64urlToBytes(jwk.y!);
    return bytesToB64url(new Uint8Array([4, ...x, ...y]));
  },
});

/** Turn on push for this device. */
export const subscribe = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, { endpoint, p256dh, auth }) => {
    const me = await requireUser(ctx);
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || p256dh.length > 200 || !auth || auth.length > 100)
      throw new AppError({ code: "BAD_REQUEST", message: "This browser sent an invalid push address" });
    const [{ n }] = await ctx.db.rows(sql`select count(*)::int as n from public.push_subscriptions where user_id = ${me._id}::uuid`);
    // First device: start from now, so turning it on doesn't send old notifications
    if (Number(n) === 0) await ctx.db.rows(sql`update public.users set push_checked_at = now() where id = ${me._id}::uuid`);
    await ctx.db.rows(sql`
      insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
      values (${me._id}::uuid, ${endpoint}, ${p256dh}, ${auth})
      on conflict (endpoint) do update
        set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, failures = 0`);
    // Keep the newest few devices
    await ctx.db.rows(sql`
      delete from public.push_subscriptions
       where user_id = ${me._id}::uuid
         and id not in (select id from public.push_subscriptions where user_id = ${me._id}::uuid
                         order by created_at desc limit ${MAX_DEVICES}::int)`);
    return null;
  },
});

/** Turn off push for this device. */
export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const me = await requireUser(ctx);
    await ctx.db.rows(sql`delete from public.push_subscriptions where endpoint = ${endpoint} and user_id = ${me._id}::uuid`);
    return null;
  },
});
