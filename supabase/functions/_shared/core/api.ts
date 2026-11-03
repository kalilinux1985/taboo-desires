// Typed references to backend functions: `api.listings.get` is just
// { __name: "listings.get" } at runtime, but carries the argument and result
// types of the server handler so calls are checked at compile time.

import type { FunctionDef, FunctionKind } from "./functions.ts";

export type FunctionReference<Kind extends FunctionKind, Args, Result> = {
  readonly __name: string;
  /** Type-only markers, never present at runtime */
  readonly __kind?: Kind;
  readonly __args?: Args;
  readonly __result?: Result;
};

export type AnyFunctionReference = FunctionReference<FunctionKind, any, any>;

export type ApiOf<R> = {
  [M in keyof R]: {
    [F in keyof R[M]]: R[M][F] extends FunctionDef<infer K, infer A, infer Res>
      ? FunctionReference<K, A, Res>
      : never;
  };
};

export type FunctionArgs<F> =
  F extends FunctionReference<FunctionKind, infer A, unknown> ? A : never;
export type FunctionReturnType<F> =
  F extends FunctionReference<FunctionKind, unknown, infer R>
    ? Awaited<R>
    : never;

/** Builds the `api` object. References are cached so they're stable across renders. */
export function makeApi<R>(): ApiOf<R> {
  const modules = new Map<string, Record<string, AnyFunctionReference>>();
  return new Proxy({} as ApiOf<R>, {
    get(_target, mod) {
      if (typeof mod !== "string") return undefined;
      let fns = modules.get(mod);
      if (!fns) {
        const cache = new Map<string, AnyFunctionReference>();
        fns = new Proxy({} as Record<string, AnyFunctionReference>, {
          get(_t, fn) {
            if (typeof fn !== "string") return undefined;
            let ref = cache.get(fn);
            if (!ref) {
              ref = Object.freeze({ __name: `${mod}.${fn}` });
              cache.set(fn, ref);
            }
            return ref;
          },
        });
        modules.set(mod, fns);
      }
      return fns;
    },
  });
}
