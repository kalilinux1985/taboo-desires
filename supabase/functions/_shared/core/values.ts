// Small runtime validators for function arguments (the job Convex's `v` did).
// Every argument coming from the browser is checked before a handler runs.

import { AppError } from "./errors.ts";
import type { Id, TableName } from "./schema.ts";

export type Validator<T> = {
  readonly kind: string;
  readonly optional: boolean;
  /** Returns the value (possibly normalized) or throws with a path-specific message. */
  parse(value: unknown, path: string): T;
};

export type Infer<V> = V extends Validator<infer T> ? T : never;

type Shape = Record<string, Validator<unknown>>;
type OptionalKeys<S extends Shape> = {
  [K in keyof S]: S[K]["optional"] extends true ? K : never;
}[keyof S];
type RequiredKeys<S extends Shape> = Exclude<keyof S, OptionalKeys<S>>;
export type InferShape<S extends Shape> = {
  [K in RequiredKeys<S>]: Infer<S[K]>;
} & {
  [K in OptionalKeys<S>]?: Infer<S[K]>;
} extends infer O
  ? { [K in keyof O]: O[K] }
  : never;

function fail(path: string, expected: string): never {
  throw new AppError({
    code: "INVALID_ARGS",
    message: `Invalid argument${path ? ` "${path}"` : ""}: expected ${expected}`,
  });
}

function make<T>(
  kind: string,
  parse: (value: unknown, path: string) => T,
): Validator<T> {
  return { kind, optional: false, parse };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

// "<bucket>/<owner user id>/<file name>"
const STORAGE_ID_RE =
  /^(public-media|private-media)\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,128}$/;

export function isStorageId(value: unknown): value is Id<"_storage"> {
  return typeof value === "string" && STORAGE_ID_RE.test(value);
}

export const v = {
  string: () =>
    make<string>("string", (x, p) =>
      typeof x === "string" && x.length <= 100_000 ? x : fail(p, "a string"),
    ),
  number: () =>
    make<number>("number", (x, p) =>
      typeof x === "number" && Number.isFinite(x) ? x : fail(p, "a number"),
    ),
  boolean: () =>
    make<boolean>("boolean", (x, p) =>
      typeof x === "boolean" ? x : fail(p, "a boolean"),
    ),
  null: () =>
    make<null>("null", (x, p) => (x === null ? null : fail(p, "null"))),
  literal: <L extends string | number | boolean>(lit: L) =>
    make<L>("literal", (x, p) =>
      x === lit ? lit : fail(p, JSON.stringify(lit)),
    ),
  id: <T extends TableName>(_table: T) =>
    make<Id<T>>("id", (x, p) =>
      isUuid(x) ? (x.toLowerCase() as Id<T>) : fail(p, `a ${_table} id`),
    ),
  storageId: () =>
    make<Id<"_storage">>("storageId", (x, p) =>
      isStorageId(x) ? x : fail(p, "a file id"),
    ),
  array: <T>(item: Validator<T>, max = 1000) =>
    make<T[]>("array", (x, p) => {
      if (!Array.isArray(x) || x.length > max)
        return fail(p, `an array (max ${max})`);
      return x.map((el, i) => item.parse(el, `${p}[${i}]`));
    }),
  object: <S extends Shape>(shape: S) =>
    make<InferShape<S>>(
      "object",
      (x, p) => parseObject(shape, x, p) as InferShape<S>,
    ),
  union: <V extends Validator<unknown>[]>(...members: V) =>
    make<Infer<V[number]>>("union", (x, p) => {
      for (const m of members) {
        try {
          return m.parse(x, p) as Infer<V[number]>;
        } catch {
          // try the next member
        }
      }
      return fail(p, members.map((m) => m.kind).join(" | "));
    }),
  optional: <T>(
    inner: Validator<T>,
  ): Validator<T | undefined> & { optional: true } => ({
    kind: `optional ${inner.kind}`,
    optional: true,
    parse: (x, p) => (x === undefined ? undefined : inner.parse(x, p)),
  }),
};

export function parseObject<S extends Shape>(
  shape: S,
  x: unknown,
  path = "",
): InferShape<S> {
  if (typeof x !== "object" || x === null || Array.isArray(x))
    fail(path, "an object");
  const input = x as Record<string, unknown>;
  for (const key of Object.keys(input)) {
    if (!(key in shape)) fail(path ? `${path}.${key}` : key, "no such field");
  }
  const out: Record<string, unknown> = {};
  for (const [key, validator] of Object.entries(shape)) {
    const value = validator.parse(input[key], path ? `${path}.${key}` : key);
    if (value !== undefined) out[key] = value;
  }
  return out as InferShape<S>;
}

export const paginationOptsValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
});

export type PaginationOptions = Infer<typeof paginationOptsValidator>;
export type PaginationResult<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string;
};
