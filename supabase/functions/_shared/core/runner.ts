import { Db } from "./db.ts";
import { AppError } from "./errors.ts";
import type { AnyFunctionDef, Identity, QueryCtx } from "./functions.ts";
import { sql, type Driver } from "./sql.ts";
import { Storage, type StorageBackend } from "./storage.ts";
import { parseObject } from "./values.ts";

/**
 * Opens a transaction, hands a driver bound to it to `fn`, commits when `fn`
 * resolves and rolls back when it throws. "read" transactions are read-only.
 */
export interface TransactionRunner {
  transaction<T>(
    mode: "read" | "write",
    fn: (driver: Driver) => Promise<T>,
  ): Promise<T>;
}

export type Registry = Record<string, Record<string, AnyFunctionDef>>;

export type ExecuteOptions = {
  registry: Registry;
  runner: TransactionRunner;
  storage: StorageBackend;
  identity: Identity | null;
  /** Allow internal functions (tests, cron). Never true for browser requests. */
  allowInternal?: boolean;
  now?: () => number;
};

const MAX_ATTEMPTS = 6;

/** Postgres serialization failure / deadlock: safe to retry the whole transaction. */
function isRetryable(e: unknown): boolean {
  const code = (e as { code?: unknown })?.code;
  return code === "40001" || code === "40P01";
}

/** The role_rules triggers raise insufficient_privilege with a message safe to show. */
function asForbidden(e: unknown): AppError | null {
  const err = e as { code?: unknown; message?: unknown };
  if (err?.code !== "42501" || typeof err.message !== "string") return null;
  // Postgres's own grant failures share the code but name internals; keep those generic
  if (err.message.startsWith("permission denied")) return null;
  return new AppError({ code: "FORBIDDEN", message: err.message });
}

export function lookup(
  registry: Registry,
  name: string,
): AnyFunctionDef | null {
  const [mod, fn, ...rest] = name.split(".");
  if (!mod || !fn || rest.length) return null;
  if (!Object.hasOwn(registry, mod) || !Object.hasOwn(registry[mod], fn))
    return null;
  return registry[mod][fn];
}

/**
 * Runs one function call the way Convex did: arguments validated, the whole
 * handler inside one serializable transaction, retried on write conflicts.
 * Returns the result, the tables it read and the tables it changed (for live updates).
 */
export async function execute(
  name: string,
  rawArgs: unknown,
  opts: ExecuteOptions,
): Promise<{ value: unknown; reads: string[]; writes: string[] }> {
  const def = lookup(opts.registry, name);
  if (!def || (def.kind === "internal" && !opts.allowInternal)) {
    throw new AppError({
      code: "NOT_FOUND",
      message: `Unknown function ${name}`,
    });
  }
  const args = parseObject(def.args, rawArgs ?? {});
  const now = opts.now ?? Date.now;

  for (let attempt = 1; ; attempt++) {
    let storage: Storage | null = null;
    try {
      const result = await opts.runner.transaction(
        def.kind === "query" ? "read" : "write",
        async (driver) => {
          const db = new Db(driver);
          storage = new Storage(opts.storage, db);
          const ctx: QueryCtx = {
            db,
            storage,
            auth: { getUserIdentity: async () => opts.identity },
            now,
          };
          const value = await def.handler(ctx, args);
          // Filled in by the app.broadcast_change() triggers, cascades included
          const written =
            def.kind === "query"
              ? null
              : await db.scalar(
                  sql`select current_setting('app.written', true)`,
                );
          const writes =
            typeof written === "string"
              ? written.split(",").filter(Boolean)
              : [];
          return {
            value: value === undefined ? null : value,
            reads: [...db.reads],
            writes,
          };
        },
      );
      await (storage as Storage | null)?.flushDeletes();
      return result;
    } catch (e) {
      if (isRetryable(e) && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, Math.random() * 20 * attempt));
        continue;
      }
      throw asForbidden(e) ?? e;
    }
  }
}
