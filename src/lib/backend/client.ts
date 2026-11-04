import { createClient } from "@supabase/supabase-js";
import type { ErrorData } from "@/backend/core/errors.ts";

// NEXT_PUBLIC_ variables are inlined into the browser bundle at build time
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
/** Name (slug) of the deployed backend Edge Function. */
const functionName = process.env.NEXT_PUBLIC_SUPABASE_FUNCTION || "api";
if (!url || !key) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example)",
  );
}

// Pages are also rendered on the server, where there is no browser session
const isBrowser = typeof window !== "undefined";

/** Supabase client: sign-in (Supabase Auth), file uploads and live-update notifications. */
export const supabase = createClient(
  url ?? "http://localhost:54321",
  key ?? "missing-key",
  {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      // Finishes sign-in when the user lands on /auth/callback from an email link
      detectSessionInUrl: isBrowser,
      storage: isBrowser ? window.localStorage : undefined,
      flowType: "pkce",
    },
  },
);

/** A failed backend call. `data` has the same { code, message } shape Convex errors had. */
export class BackendError extends Error {
  readonly data: ErrorData;
  readonly status: number;
  constructor(data: ErrorData, status: number) {
    super(data.message);
    this.name = "BackendError";
    this.data = data;
    this.status = status;
  }
}

export type CallResult<T = unknown> = {
  value: T;
  reads: string[];
  writes: string[];
};

/** Calls one backend function through the `api` Edge Function. */
export async function callBackend<T>(
  name: string,
  args: unknown,
  token: string | null,
): Promise<CallResult<T>> {
  if (!url || !key) {
    throw new BackendError(
      {
        code: "INTERNAL",
        message:
          "This site isn't connected to its backend yet: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then rebuild.",
      },
      0,
    );
  }
  let res: Response;
  try {
    res = await fetch(`${url}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key ?? "",
        ...(token ? { "x-user-token": token } : {}),
      },
      body: JSON.stringify({ fn: name, args }),
    });
  } catch {
    throw new BackendError(
      {
        code: "INTERNAL",
        message: "Can't reach the server. Check your connection.",
      },
      0,
    );
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || "error" in body) {
    const data: ErrorData = body?.error ?? {
      code: "INTERNAL",
      message: "Something went wrong",
    };
    throw new BackendError(data, res.status);
  }
  return body as CallResult<T>;
}
