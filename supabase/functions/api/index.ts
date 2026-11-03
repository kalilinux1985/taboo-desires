// The app's backend: one Edge Function that runs every query and mutation.
//
//   POST /functions/v1/api   { "fn": "listings.get", "args": { ... } }
//   header x-user-token: <Supabase Auth access token>   (omit when signed out)
//
// Each call runs inside one Postgres transaction (serializable for writes,
// retried on conflicts). Responses: 200 { value, reads } or 4xx/5xx { error }.
//
// No secrets to set: sign-in uses this project's Supabase Auth.
// Optional: PUBLIC_SUPABASE_URL (browser-reachable URL, only needed for local
// `supabase functions serve`), ALLOWED_ORIGINS (comma-separated; default *).
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_DB_URL are provided by Supabase.

import postgres from "npm:postgres@3.4.5";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { AppError } from "../_shared/core/errors.ts";
import { createHandler } from "../_shared/core/http.ts";
import type { Identity } from "../_shared/core/functions.ts";
import type { TransactionRunner } from "../_shared/core/runner.ts";
import type { Param } from "../_shared/core/sql.ts";
import type { StorageBackend } from "../_shared/core/storage.ts";
import { sql as q } from "../_shared/core/sql.ts";
import { registry } from "../_shared/registry.ts";

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
};

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const db = postgres(env("SUPABASE_DB_URL"), {
  prepare: false, // required behind Supabase's transaction pooler
  max: 4,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: { TimeZone: "UTC" },
});

const runner: TransactionRunner = {
  async transaction(mode, fn) {
    const options =
      mode === "read"
        ? "isolation level repeatable read read only"
        : "isolation level serializable";
    return (await db.begin(options, (tx) =>
      fn({
        query: async (text: string, params: Param[]) =>
          (await tx.unsafe(text, params as string[])) as unknown as Record<
            string,
            unknown
          >[],
      }),
    )) as Awaited<ReturnType<typeof fn>>;
  },
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const supabaseUrl = env("SUPABASE_URL");
const publicBase = (Deno.env.get("PUBLIC_SUPABASE_URL") ?? supabaseUrl).replace(
  /\/$/,
  "",
);
const admin = createClient(supabaseUrl, env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Signed URLs come back with the function's internal base URL; point them at the public one. */
const toPublic = (url: string) => url.replace(/^https?:\/\/[^/]+/, publicBase);
const encodePath = (path: string) =>
  path.split("/").map(encodeURIComponent).join("/");

const storage: StorageBackend = {
  publicUrl: (bucket, path) =>
    `${publicBase}/storage/v1/object/public/${bucket}/${encodePath(path)}`,
  async signedUrls(bucket, paths, ttl) {
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrls(paths, ttl);
    if (error) throw error;
    const byPath = new Map(
      (data ?? []).map((d) => [d.path, d.error ? null : d.signedUrl]),
    );
    return paths.map((p) => {
      const url = byPath.get(p);
      return url ? toPublic(url) : null;
    });
  },
  async remove(bucket, paths) {
    const { error } = await admin.storage.from(bucket).remove(paths);
    if (error) throw error;
  },
  async createUploadUrl(bucket, path) {
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("Could not create upload URL");
    return { signedUrl: toPublic(data.signedUrl), token: data.token };
  },
  async contentType(txDb, bucket, path) {
    const rows = await txDb.rows(
      q`select metadata ->> 'mimetype' as content_type from storage.objects where bucket_id = ${bucket} and name = ${path}`,
    );
    if (rows.length === 0) return undefined;
    return (rows[0].content_type as string | null) ?? null;
  },
};

// ---------------------------------------------------------------------------
// Auth: verify the Supabase Auth access token sent by the browser
// ---------------------------------------------------------------------------

// Verified tokens are remembered briefly so each request doesn't re-check
const IDENTITY_CACHE_MS = 60_000;
const identities = new Map<string, { identity: Identity; until: number }>();

async function identify(token: string | null): Promise<Identity | null> {
  if (!token) return null;
  const now = Date.now();
  const cached = identities.get(token);
  if (cached && cached.until > now) return cached.identity;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    identities.delete(token);
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Your session has expired. Please sign in again",
    });
  }
  const user = data.user;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const identity: Identity = {
    tokenIdentifier: `supabase|${user.id}`,
    name:
      typeof meta.name === "string" && meta.name.trim()
        ? meta.name.trim()
        : undefined,
    email: user.email ?? undefined,
    emailVerified: !!user.email_confirmed_at,
  };
  if (identities.size > 5_000) identities.clear();
  identities.set(token, { identity, until: now + IDENTITY_CACHE_MS });
  return identity;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

Deno.serve(
  createHandler({
    registry,
    runner,
    storage,
    identify,
    allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") ?? "*")
      .split(",")
      .map((s) => s.trim()),
  }),
);
