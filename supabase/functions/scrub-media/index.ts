// Server-side privacy check for every uploaded photo and video. Removes GPS
// location, camera details and dates, overwriting the file with the clean
// copy, and records the result in public.media_scrubs. Nothing can be
// attached to a listing, post or profile until its file is marked "clean"
// (see _shared/lib/files.ts), so a file uploaded without the site's own
// upload form (which cleans in the browser first) is still cleaned here.
//
// Called two ways, both safe to repeat:
//   - by the browser right after an upload: { "storageId": "bucket/owner/uuid" }
//   - by an every-minute sweep (pg_cron) of files not yet checked: { "bucket": "...", "name": "..." }
//
// Files that can't be checked (unknown formats, damaged files, non-media) are
// deleted and marked "rejected".
//
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_DB_URL are provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import postgres from "npm:postgres@3.4.5";
import { blankXmpGps, boxHeader, cleanJpeg, scanBox, scrubMoov, sniff, stripPng, stripWebp } from "./strip-core.ts";

const BUCKETS = new Set(["public-media", "private-media"]);
const IMAGE_MAX = 25 * 1024 * 1024;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const db = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2, idle_timeout: 20, connect_timeout: 10 });

type Result = "clean" | "rejected";

async function record(storageId: string, status: Result, detail: string) {
  await db`
    insert into public.media_scrubs (storage_id, status, detail, checked_at)
    values (${storageId}, ${status}, ${detail.slice(0, 200)}, now())
    on conflict (storage_id) do update set status = excluded.status, detail = excluded.detail, checked_at = now()`;
}

async function reject(bucket: string, name: string, why: string): Promise<Result> {
  await admin.storage.from(bucket).remove([name]);
  await record(`${bucket}/${name}`, "rejected", why);
  return "rejected";
}

async function overwrite(bucket: string, name: string, body: Uint8Array | ReadableStream<Uint8Array>, contentType: string, size?: number) {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${name.split("/").map(encodeURIComponent).join("/")}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": contentType,
      "x-upsert": "true",
      "cache-control": "max-age=3600",
      ...(size !== undefined ? { "Content-Length": String(size) } : {}),
    },
    body,
    // @ts-ignore: Deno supports streaming request bodies
    duplex: "half",
  });
  if (!res.ok) throw new Error(`overwrite failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

/** Byte range of a stored file (Range request on a short-lived signed URL). */
async function readRange(url: string, start: number, end: number): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { Range: `bytes=${start}-${end - 1}` } });
  if (!res.ok && res.status !== 206) throw new Error(`range read failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Videos: read every metadata box with range reads, and rewrite the file only if one holds a location. */
async function scrubVideo(bucket: string, name: string, size: number, contentType: string): Promise<Result> {
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(name, 600);
  if (error || !data) throw error ?? new Error("no signed url");
  const url = data.signedUrl;
  const patches: { start: number; bytes: Uint8Array }[] = [];
  let at = 0;
  let boxes = 0;
  while (at + 8 <= size) {
    if (++boxes > 200) return reject(bucket, name, "damaged video");
    const { type, size: boxSize } = boxHeader(await readRange(url, at, Math.min(at + 16, size)), size - at);
    if (boxSize < 8 || at + boxSize > size) return reject(bucket, name, "damaged video");
    if (scanBox(type)) {
      if (boxSize > 64 * 1024 * 1024) return reject(bucket, name, "video metadata too large");
      const box = await readRange(url, at, at + boxSize);
      if (scrubMoov(box)) patches.push({ start: at, bytes: box });
    }
    at += boxSize;
  }
  if (patches.length === 0) {
    await record(`${bucket}/${name}`, "clean", "video: no location");
    return "clean";
  }
  // Stream the original back with the cleaned boxes patched in place
  const original = await fetch(url);
  if (!original.ok || !original.body) throw new Error("download failed");
  let pos = 0;
  const patched = original.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        for (const p of patches) {
          const from = Math.max(p.start, pos);
          const to = Math.min(p.start + p.bytes.length, pos + chunk.length);
          if (from < to) {
            chunk = chunk.slice();
            chunk.set(p.bytes.subarray(from - p.start, to - p.start), from - pos);
          }
        }
        pos += chunk.length;
        ctrl.enqueue(chunk);
      },
    }),
  );
  await overwrite(bucket, name, patched, contentType, size);
  await record(`${bucket}/${name}`, "clean", "video: location removed");
  return "clean";
}

async function scrub(bucket: string, name: string): Promise<Result> {
  const storageId = `${bucket}/${name}`;
  const [obj] = await db`
    select (metadata->>'size')::bigint as size, metadata->>'mimetype' as type, updated_at
      from storage.objects where bucket_id = ${bucket} and name = ${name}`;
  if (!obj) return "rejected";
  const [done] = await db`select status, checked_at from public.media_scrubs where storage_id = ${storageId}`;
  if (done && new Date(done.checked_at) >= new Date(obj.updated_at)) return done.status as Result;

  const size = Number(obj.size ?? 0);
  if (size < 16) return reject(bucket, name, "empty or damaged file");
  const head = await (async () => {
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(name, 120);
    if (error || !data) throw error ?? new Error("no signed url");
    return { url: data.signedUrl, bytes: await readRange(data.signedUrl, 0, Math.min(size, 16)) };
  })();
  const kind = sniff(head.bytes);

  if (kind === "video") {
    if (bucket !== "private-media") return reject(bucket, name, "video in the photo bucket");
    return scrubVideo(bucket, name, size, String(obj.type || "video/mp4"));
  }
  if (kind === "other") return reject(bucket, name, "unsupported or unknown format");
  if (size > IMAGE_MAX) return reject(bucket, name, "photo too large");

  const original = new Uint8Array(await (await fetch(head.url)).arrayBuffer());
  if (kind === "gif") {
    if (blankXmpGps(original)) await overwrite(bucket, name, original, "image/gif");
    await record(storageId, "clean", "gif");
    return "clean";
  }
  const cleaned = kind === "png" ? stripPng(original) : kind === "webp" ? stripWebp(original) : cleanJpeg(original);
  if (cleaned === original) return reject(bucket, name, "damaged photo");
  const type = kind === "png" ? "image/png" : kind === "webp" ? "image/webp" : "image/jpeg";
  if (cleaned.length !== original.length || cleaned.some((b, i) => b !== original[i]))
    await overwrite(bucket, name, cleaned, type);
  await record(storageId, "clean", `${kind}: ${original.length - cleaned.length} bytes removed`);
  return "clean";
}

// The browser calls this right after an upload. Any site may ask: the function only ever cleans files.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: CORS });
  let body: { storageId?: string; bucket?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400, headers: CORS });
  }
  let bucket = body.bucket ?? "";
  let name = body.name ?? "";
  if (body.storageId) {
    const i = body.storageId.indexOf("/");
    bucket = body.storageId.slice(0, i);
    name = body.storageId.slice(i + 1);
  }
  if (!BUCKETS.has(bucket) || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(name)) return new Response("bad file", { status: 400, headers: CORS });
  try {
    const status = await scrub(bucket, name);
    return Response.json({ status }, { headers: CORS });
  } catch (e) {
    console.error("scrub failed", bucket, name, e);
    return Response.json({ status: "error" }, { status: 500, headers: CORS });
  }
});
