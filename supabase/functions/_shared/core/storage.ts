// File storage on Supabase Storage. A storage id is "<bucket>/<owner id>/<file>":
//  - public-media: listing photos, blurred previews, avatars, profile and feed photos
//  - private-media: locked (paid) originals and verification photos, signed URLs only
// Deletions are queued and only run after the transaction commits.

import type { Db } from "./db.ts";
import type { Id } from "./schema.ts";
import { isStorageId } from "./values.ts";

export type Visibility = "public" | "private";

export const BUCKETS: Record<Visibility, string> = {
  public: "public-media",
  private: "private-media",
};

/** Seconds a signed URL for a private file stays valid. */
export const SIGNED_URL_TTL = 6 * 60 * 60;

export type UploadTicket = {
  storageId: Id<"_storage">;
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
};

/** Platform-specific storage operations (Supabase in production, in-memory in tests). */
export interface StorageBackend {
  publicUrl(bucket: string, path: string): string;
  signedUrls(
    bucket: string,
    paths: string[],
    ttlSeconds: number,
  ): Promise<(string | null)[]>;
  remove(bucket: string, paths: string[]): Promise<void>;
  createUploadUrl(
    bucket: string,
    path: string,
  ): Promise<{ signedUrl: string; token: string }>;
  contentType(
    db: Db,
    bucket: string,
    path: string,
  ): Promise<string | null | undefined>;
}

export function splitStorageId(
  id: string,
): { bucket: string; path: string; ownerId: string } | null {
  if (!isStorageId(id)) return null;
  const slash = id.indexOf("/");
  const bucket = id.slice(0, slash);
  const path = id.slice(slash + 1);
  return { bucket, path, ownerId: path.split("/")[0] };
}

export function visibilityOf(id: string): Visibility | null {
  const parts = splitStorageId(id);
  if (!parts) return null;
  return parts.bucket === BUCKETS.private ? "private" : "public";
}

/** True when the file was uploaded by `userId` into the expected bucket. */
export function isOwnFile(
  id: string,
  userId: string,
  visibility: Visibility,
): boolean {
  const parts = splitStorageId(id);
  return (
    !!parts && parts.ownerId === userId && parts.bucket === BUCKETS[visibility]
  );
}

export class Storage {
  private readonly pendingDeletes = new Set<string>();
  private signBatch: {
    ids: string[];
    resolvers: ((url: string | null) => void)[];
  } | null = null;

  constructor(
    private readonly backend: StorageBackend,
    private readonly db: Db,
  ) {}

  /** A URL the browser can load, or null for an invalid id. Private files get a signed URL. */
  getUrl(
    id: Id<"_storage"> | string | undefined | null,
  ): Promise<string | null> {
    if (!id) return Promise.resolve(null);
    const parts = splitStorageId(id);
    if (!parts) return Promise.resolve(null);
    if (parts.bucket !== BUCKETS.private)
      return Promise.resolve(this.backend.publicUrl(parts.bucket, parts.path));
    // Batch signing requests made in the same tick into one call
    return new Promise((resolve) => {
      if (!this.signBatch) {
        const batch = {
          ids: [] as string[],
          resolvers: [] as ((url: string | null) => void)[],
        };
        this.signBatch = batch;
        queueMicrotask(async () => {
          this.signBatch = null;
          try {
            const urls = await this.backend.signedUrls(
              BUCKETS.private,
              batch.ids.map((x) => splitStorageId(x)!.path),
              SIGNED_URL_TTL,
            );
            batch.resolvers.forEach((r, i) => r(urls[i] ?? null));
          } catch (e) {
            console.error("signing private URLs failed", e);
            batch.resolvers.forEach((r) => r(null));
          }
        });
      }
      this.signBatch.ids.push(id);
      this.signBatch.resolvers.push(resolve);
    });
  }

  /** Content type recorded at upload, null if unknown, undefined if the file doesn't exist. */
  async getContentType(id: string): Promise<string | null | undefined> {
    const parts = splitStorageId(id);
    if (!parts) return undefined;
    return await this.backend.contentType(this.db, parts.bucket, parts.path);
  }

  /** Queues a file for deletion once the transaction has committed. */
  delete(id: Id<"_storage"> | string | undefined | null): void {
    if (id && splitStorageId(id)) this.pendingDeletes.add(id);
  }

  async generateUploadUrl(
    ownerId: string,
    visibility: Visibility,
  ): Promise<UploadTicket> {
    const bucket = BUCKETS[visibility];
    const path = `${ownerId}/${crypto.randomUUID()}`;
    const { signedUrl, token } = await this.backend.createUploadUrl(
      bucket,
      path,
    );
    return {
      storageId: `${bucket}/${path}` as Id<"_storage">,
      bucket,
      path,
      token,
      signedUrl,
    };
  }

  /** Runs queued deletions. Called after commit; failures are logged, not thrown. */
  async flushDeletes(): Promise<void> {
    if (this.pendingDeletes.size === 0) return;
    const byBucket = new Map<string, string[]>();
    for (const id of this.pendingDeletes) {
      const parts = splitStorageId(id)!;
      byBucket.set(parts.bucket, [
        ...(byBucket.get(parts.bucket) ?? []),
        parts.path,
      ]);
    }
    this.pendingDeletes.clear();
    for (const [bucket, paths] of byBucket) {
      try {
        await this.backend.remove(bucket, paths);
      } catch (e) {
        console.error(
          `deleting ${paths.length} file(s) from ${bucket} failed`,
          e,
        );
      }
    }
  }
}
