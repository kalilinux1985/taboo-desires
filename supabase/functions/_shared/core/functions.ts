import type { Db } from "./db.ts";
import type { Storage } from "./storage.ts";
import type { InferShape, Validator } from "./values.ts";

/** Verified identity of the signed-in user (from Supabase Auth). */
export type Identity = {
  /** "supabase|<auth user id>", the stable key stored on users.token_identifier */
  tokenIdentifier: string;
  name?: string;
  email?: string;
  /** True once the user has confirmed they own `email` */
  emailVerified?: boolean;
};

export type QueryCtx = {
  db: Db;
  storage: Storage;
  auth: { getUserIdentity(): Promise<Identity | null> };
  /** Current time in ms. Use this instead of Date.now() so tests can control time. */
  now(): number;
};

export type MutationCtx = QueryCtx;

/**
 * Runs outside any transaction so it can call other services (EasyPost).
 * It reads and writes only through runQuery / runMutation, each of which is
 * its own transaction. Never call an outside service inside a mutation: the
 * mutation can be retried on write conflicts and would call it twice.
 */
export type ActionCtx = {
  auth: { getUserIdentity(): Promise<Identity | null> };
  now(): number;
  runQuery<A, R>(fn: FunctionDef<"query" | "internal", A, R>, args: A): Promise<R>;
  runMutation<A, R>(
    fn: FunctionDef<"mutation" | "internal", A, R>,
    args: A,
  ): Promise<R>;
};

/**
 * query = read-only, mutation = read-write, action = calls outside services,
 * internal = server/tests only (never callable from the browser).
 */
export type FunctionKind = "query" | "mutation" | "action" | "internal";

type Shape = Record<string, Validator<unknown>>;

export type FunctionDef<K extends FunctionKind, Args, Result> = {
  kind: K;
  args: Shape;
  handler: K extends "action"
    ? (ctx: ActionCtx, args: Args) => Promise<Result>
    : (ctx: QueryCtx, args: Args) => Promise<Result>;
};

export type AnyFunctionDef = FunctionDef<FunctionKind, any, unknown>;

export function query<S extends Shape, R>(def: {
  args: S;
  handler: (ctx: QueryCtx, args: InferShape<S>) => Promise<R>;
}): FunctionDef<"query", InferShape<S>, R> {
  return { kind: "query", ...def };
}

export function mutation<S extends Shape, R>(def: {
  args: S;
  handler: (ctx: MutationCtx, args: InferShape<S>) => Promise<R>;
}): FunctionDef<"mutation", InferShape<S>, R> {
  return { kind: "mutation", ...def };
}

export function internalMutation<S extends Shape, R>(def: {
  args: S;
  handler: (ctx: MutationCtx, args: InferShape<S>) => Promise<R>;
}): FunctionDef<"internal", InferShape<S>, R> {
  return { kind: "internal", ...def };
}

export function action<S extends Shape, R>(def: {
  args: S;
  handler: (ctx: ActionCtx, args: InferShape<S>) => Promise<R>;
}): FunctionDef<"action", InferShape<S>, R> {
  return { kind: "action", ...def };
}
