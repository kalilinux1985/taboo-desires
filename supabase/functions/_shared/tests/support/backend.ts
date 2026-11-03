// Test harness with the same shape as convex-test: an isolated database per
// backend, `withIdentity` callers, `query` / `mutation` / `run`, and an
// in-memory file store.
//
// Database: if TEST_DATABASE_URL is set (e.g. the Postgres from `supabase start`:
// postgresql://postgres:postgres@127.0.0.1:54322/postgres) each backend gets a
// fresh database cloned from a template with the schema migration applied.
// Otherwise an in-process PGlite instance is used.

import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Db } from "../../core/db.ts";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "../../core/api.ts";
import type { FunctionKind, Identity, QueryCtx } from "../../core/functions.ts";
import { execute, type TransactionRunner } from "../../core/runner.ts";
import type { Id } from "../../core/schema.ts";
import type { Driver, Param } from "../../core/sql.ts";
import {
  BUCKETS,
  Storage,
  type StorageBackend,
  type Visibility,
} from "../../core/storage.ts";
import { registry } from "../../registry.ts";
import { PgWire } from "./pgwire.ts";

// Every migration that runs on plain Postgres (the platform one needs Supabase)
const MIGRATION = [
  "20261031000000_init_schema.sql",
  "20261103080131_role_rules.sql",
]
  .map((file) =>
    readFileSync(
      fileURLToPath(
        new URL(`../../../../migrations/${file}`, import.meta.url),
      ),
      "utf8",
    ),
  )
  .join("\n");

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export class MemoryStorage implements StorageBackend {
  /** storage id -> content type */
  readonly files = new Map<string, string | null>();

  publicUrl(bucket: string, path: string) {
    return `https://storage.test/public/${bucket}/${path}`;
  }
  async signedUrls(bucket: string, paths: string[]) {
    return paths.map((p) =>
      this.files.has(`${bucket}/${p}`)
        ? `https://storage.test/signed/${bucket}/${p}?token=t`
        : null,
    );
  }
  async remove(bucket: string, paths: string[]) {
    for (const p of paths) this.files.delete(`${bucket}/${p}`);
  }
  async createUploadUrl(bucket: string, path: string) {
    return {
      signedUrl: `https://storage.test/upload/${bucket}/${path}`,
      token: "upload-token",
    };
  }
  async contentType(_db: Db, bucket: string, path: string) {
    const id = `${bucket}/${path}`;
    return this.files.has(id) ? this.files.get(id) : undefined;
  }
}

// ---------------------------------------------------------------------------
// Databases
// ---------------------------------------------------------------------------

type Connection = { runner: TransactionRunner; close(): Promise<void> };

function runnerFor(
  query: (text: string, params: Param[]) => Promise<Record<string, unknown>[]>,
): TransactionRunner {
  const driver: Driver = { query };
  return {
    async transaction(mode, fn) {
      await query(
        mode === "read"
          ? "begin isolation level repeatable read read only"
          : "begin isolation level serializable",
        [],
      );
      try {
        const result = await fn(driver);
        await query("commit", []);
        return result;
      } catch (e) {
        await query("rollback", []).catch(() => undefined);
        throw e;
      }
    },
  };
}

let templateReady: Promise<string> | null = null;

async function postgresTemplate(adminUrl: string): Promise<string> {
  const hash = createHash("sha256")
    .update(MIGRATION)
    .digest("hex")
    .slice(0, 12);
  const name = `app_test_tpl_${hash}`;
  const admin = await PgWire.connect(adminUrl);
  try {
    const exists = await admin.query(
      `select 1 from pg_database where datname = '${name}'`,
    );
    if (exists.length === 0) {
      const building = `${name}_build_${process.pid}`;
      await admin.query(`drop database if exists ${building}`);
      await admin.query(`create database ${building}`);
      const url = new URL(adminUrl);
      url.pathname = `/${building}`;
      const db = await PgWire.connect(url.toString());
      await db.query(MIGRATION);
      await db.close();
      // Another worker may have won the race; either way the template exists afterwards
      await admin
        .query(`alter database ${building} rename to ${name}`)
        .catch(async () => {
          await admin.query(`drop database if exists ${building}`);
        });
      // Templates of older migrations are no longer needed
      const stale = await admin.query(
        `select datname from pg_database where datname like 'app_test_tpl_%' and datname <> '${name}' and datname not like '%_build_%'`,
      );
      for (const row of stale)
        await admin
          .query(`drop database if exists ${String(row.datname)}`)
          .catch(() => undefined);
    }
  } finally {
    await admin.close();
  }
  return name;
}

async function connectPostgres(adminUrl: string): Promise<Connection> {
  templateReady ??= postgresTemplate(adminUrl);
  const template = await templateReady;
  const name = `app_test_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const admin = await PgWire.connect(adminUrl);
  await admin.query(`create database ${name} template ${template}`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const client = await PgWire.connect(url.toString());
  return {
    runner: runnerFor((text, params) => client.query(text, params)),
    async close() {
      await client.close();
      await admin
        .query(`drop database if exists ${name} with (force)`)
        .catch(() => undefined);
      await admin.close();
    },
  };
}

async function connectPglite(): Promise<Connection> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();
  await pg.exec("set timezone = 'UTC'");
  await pg.exec(MIGRATION);
  return {
    runner: runnerFor(
      async (text, params) =>
        (await pg.query<Record<string, unknown>>(text, params)).rows,
    ),
    close: () => pg.close(),
  };
}

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------

type Ref<K extends FunctionKind = FunctionKind> = FunctionReference<
  K,
  any,
  any
>;

export type Caller = {
  query<F extends Ref<"query">>(
    ref: F,
    args?: FunctionArgs<F>,
  ): Promise<FunctionReturnType<F>>;
  mutation<F extends Ref<"mutation" | "internal">>(
    ref: F,
    args?: FunctionArgs<F>,
  ): Promise<FunctionReturnType<F>>;
};

export type TestBackend = Caller & {
  withIdentity(identity: Identity): Caller;
  /** Runs code directly against the database in one transaction (like convex-test's t.run). */
  run<T>(fn: (ctx: QueryCtx) => Promise<T>): Promise<T>;
  /** Puts a file in the store as if `ownerId` uploaded it; returns its storage id. */
  storeFile(
    ownerId: string,
    opts?: { contentType?: string | null; visibility?: Visibility },
  ): Id<"_storage">;
  files: MemoryStorage;
  /** The database transaction runner (to build an HTTP handler in tests). */
  runner: TransactionRunner;
  /** Calls a function the way the api Edge Function does and returns { value, reads, writes }. */
  execute(
    name: string,
    args: unknown,
    opts?: { identity?: Identity | null; allowInternal?: boolean },
  ): Promise<{ value: unknown; reads: string[]; writes: string[] }>;
  close(): Promise<void>;
};

const open = new Set<TestBackend>();

/** Closes every backend created so far (registered as an afterEach hook in setup.ts). */
export async function closeAllTestBackends() {
  const all = [...open];
  open.clear();
  await Promise.all(all.map((b) => b.close()));
}

export async function createTestBackend(): Promise<TestBackend> {
  const url = process.env.TEST_DATABASE_URL;
  const conn = url ? await connectPostgres(url) : await connectPglite();
  const files = new MemoryStorage();

  const call = (identity: Identity | null) => (ref: Ref, args?: unknown) =>
    execute(ref.__name, args ?? {}, {
      registry,
      runner: conn.runner,
      storage: files,
      identity,
      allowInternal: true,
    }).then((r) => r.value as never);

  const caller = (identity: Identity | null): Caller => ({
    query: call(identity),
    mutation: call(identity),
  });

  const backend: TestBackend = {
    ...caller(null),
    withIdentity: (identity) => caller(identity),
    run: (fn) =>
      conn.runner.transaction("write", async (driver) => {
        const db = new Db(driver);
        const storage = new Storage(files, db);
        const result = await fn({
          db,
          storage,
          auth: { getUserIdentity: async () => null },
          now: Date.now,
        });
        await storage.flushDeletes();
        return result;
      }),
    storeFile(ownerId, opts = {}) {
      const id =
        `${BUCKETS[opts.visibility ?? "public"]}/${ownerId}/${randomUUID()}` as Id<"_storage">;
      files.files.set(
        id,
        opts.contentType === undefined ? "image/png" : opts.contentType,
      );
      return id;
    },
    files,
    runner: conn.runner,
    execute: (name, args, opts = {}) =>
      execute(name, args, {
        registry,
        runner: conn.runner,
        storage: files,
        identity: opts.identity ?? null,
        allowInternal: opts.allowInternal ?? false,
      }),
    close: () => conn.close(),
  };
  open.add(backend);
  return backend;
}
