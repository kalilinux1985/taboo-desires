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

/** query = read-only, mutation = read-write, internal = server/tests only (never callable from the browser). */
export type FunctionKind = "query" | "mutation" | "internal";

type Shape = Record<string, Validator<unknown>>;

export type FunctionDef<K extends FunctionKind, Args, Result> = {
  kind: K;
  args: Shape;
  handler: (ctx: QueryCtx, args: Args) => Promise<Result>;
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
