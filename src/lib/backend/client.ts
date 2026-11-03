import { createClient } from "@supabase/supabase-js";
import type { ErrorData } from "@/backend/core/errors.ts";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
/** Name (slug) of the deployed backend Edge Function. */
const functionName =
  (import.meta.env.VITE_SUPABASE_FUNCTION as string | undefined) ?? "api";
if (!url || !key) {
  console.error(
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example)",
  );
}

/** Supabase client: sign-in (Supabase Auth), file uploads and live-update notifications. */
export const supabase = createClient(
  url ?? "http://localhost:54321",
  key ?? "missing-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Finishes sign-in when the user lands on /auth/callback from an email link
      detectSessionInUrl: true,
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
