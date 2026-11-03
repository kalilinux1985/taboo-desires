import { AppError, HTTP_STATUS } from "./errors.ts";
import type { Identity } from "./functions.ts";
import { execute, type Registry, type TransactionRunner } from "./runner.ts";
import type { StorageBackend } from "./storage.ts";

export type HandlerOptions = {
  registry: Registry;
  runner: TransactionRunner;
  storage: StorageBackend;
  /** Verifies the x-user-token header; throws AppError(UNAUTHENTICATED) when invalid. */
  identify: (token: string | null) => Promise<Identity | null>;
  /** Allowed CORS origins; "*" allows any. */
  allowedOrigins: string[];
};

const MAX_BODY_BYTES = 1_000_000;

/**
 * HTTP handler for the api Edge Function:
 *   POST { "fn": "listings.get", "args": { ... } }  (+ x-user-token header)
 *   -> 200 { value, reads, writes } | 4xx/5xx { error: { code, message } }
 */
export function createHandler(
  opts: HandlerOptions,
): (req: Request) => Promise<Response> {
  const cors = (req: Request): Record<string, string> => {
    const origin = req.headers.get("origin") ?? "";
    const anyOrigin = opts.allowedOrigins.includes("*");
    const allow = anyOrigin
      ? "*"
      : opts.allowedOrigins.includes(origin)
        ? origin
        : opts.allowedOrigins[0];
    return {
      "Access-Control-Allow-Origin": allow,
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-user-token",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    };
  };

  return async (req) => {
    const headers = { ...cors(req), "Content-Type": "application/json" };
    if (req.method === "OPTIONS") return new Response(null, { headers });
    if (req.method !== "POST")
      return new Response(null, { status: 405, headers });

    try {
      const text = await req.text();
      if (text.length > MAX_BODY_BYTES)
        throw new AppError({
          code: "BAD_REQUEST",
          message: "Request too large",
        });
      let body: { fn?: unknown; args?: unknown };
      try {
        body = JSON.parse(text);
      } catch {
        throw new AppError({ code: "BAD_REQUEST", message: "Invalid JSON" });
      }
      if (!body || typeof body.fn !== "string") {
        throw new AppError({
          code: "BAD_REQUEST",
          message: "Missing function name",
        });
      }
      const identity = await opts.identify(req.headers.get("x-user-token"));
      const result = await execute(body.fn, body.args ?? {}, {
        registry: opts.registry,
        runner: opts.runner,
        storage: opts.storage,
        identity,
      });
      return new Response(JSON.stringify(result), { headers });
    } catch (e) {
      if (e instanceof AppError) {
        return new Response(JSON.stringify({ error: e.data }), {
          status: HTTP_STATUS[e.data.code],
          headers,
        });
      }
      console.error(e);
      return new Response(
        JSON.stringify({
          error: { code: "INTERNAL", message: "Something went wrong" },
        }),
        {
          status: 500,
          headers,
        },
      );
    }
  };
}
