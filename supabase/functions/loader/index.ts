// Deployed once as the "rapid-endpoint" Edge Function. It loads the real backend
// (backend-dist/api.cjs, built from supabase/functions/api) from this project's
// GitHub repo and runs it, so pushing to main updates the live backend without
// redeploying the function. It checks for a new build every couple of minutes
// and keeps serving the last good build if GitHub can't be reached or a new
// build fails to start.
//
//   GET ?loader=status    which build is running
//   GET ?loader=selftest  runs a read-only backend call against the database

import postgres from "npm:postgres@3.4.5";
import * as supabaseJs from "npm:@supabase/supabase-js@2.49.4";

const SOURCE =
  "https://raw.githubusercontent.com/kalilinux1985/taboo-desires/main/backend-dist/api.cjs";
const CHECK_EVERY_MS = 2 * 60 * 1000;

// The bundle's npm imports, handed to it through require()
const MODULES: Record<string, unknown> = {
  "npm:postgres@3.4.5": postgres,
  "npm:@supabase/supabase-js@2.49.4": supabaseJs,
};

type Handler = (req: Request) => Response | Promise<Response>;
type Build = { handler: Handler; etag: string; loadedAt: string; bytes: number };

let current: Build | null = null;
let lastCheck = 0;
let checking: Promise<void> | null = null;

/** Runs the bundle's code and returns the request handler it registers with Deno.serve. */
function evaluate(code: string): Handler {
  let handler: Handler | null = null;
  // The bundle only uses Deno.env and Deno.serve; serve hands back its handler
  const fakeDeno = {
    env: Deno.env,
    serve: (...args: unknown[]) => {
      handler = args.find((a) => typeof a === "function") as Handler;
      return { finished: new Promise(() => {}), shutdown: async () => {} };
    },
  };
  const require = (name: string) => {
    if (!(name in MODULES)) throw new Error(`Backend asked for an unknown module: ${name}`);
    return MODULES[name];
  };
  const module = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", "Deno", code)(
    require,
    module,
    module.exports,
    fakeDeno,
  );
  if (!handler) throw new Error("The backend build did not start a server");
  return handler;
}

async function refresh(): Promise<void> {
  lastCheck = Date.now();
  const res = await fetch(SOURCE, {
    headers: current ? { "If-None-Match": current.etag } : {},
  });
  if (res.status === 304) return;
  if (!res.ok) throw new Error(`Could not download the backend (HTTP ${res.status})`);
  const code = await res.text();
  const etag = res.headers.get("etag") ?? String(code.length);
  if (current && etag === current.etag) return;
  current = {
    handler: evaluate(code),
    etag,
    loadedAt: new Date().toISOString(),
    bytes: code.length,
  };
}

/** Loads the backend on first use, then looks for a newer build in the background. */
async function ready(): Promise<Build> {
  if (!current) {
    checking ??= refresh().finally(() => (checking = null));
    await checking;
  } else if (!checking && Date.now() - lastCheck > CHECK_EVERY_MS) {
    checking = refresh()
      .catch((e) => console.error("Backend update failed; keeping the running build.", e))
      .finally(() => (checking = null));
  }
  return current!;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

Deno.serve(async (req) => {
  let build: Build;
  try {
    build = await ready();
  } catch (e) {
    console.error("Backend failed to load", e);
    return json({ error: "The backend is starting up. Please try again in a moment." }, 503);
  }

  const mode = req.method === "GET" ? new URL(req.url).searchParams.get("loader") : null;
  if (mode === "status") {
    return json({ etag: build.etag, loadedAt: build.loadedAt, bytes: build.bytes });
  }
  if (mode === "selftest") {
    const probe = new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fn: "posts.likers",
        args: { postId: "00000000-0000-4000-8000-000000000000" },
      }),
    });
    const res = await build.handler(probe);
    return json({ backendStatus: res.status, backendBody: await res.json(), loadedAt: build.loadedAt });
  }
  return build.handler(req);
});
