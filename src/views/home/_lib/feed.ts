import type { FunctionReturnType } from "@/lib/backend/types.ts";
import type { api } from "@/lib/backend/api.ts";

export type FeedItem = FunctionReturnType<typeof api.posts.feed>["page"][number];
export type FeedFilter = "all" | "photo" | "listing" | "status";
export type FeedSort = "newest" | "popular";

export const FEED_FILTERS: { value: FeedFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "photo", label: "Photos" },
  { value: "listing", label: "Listings" },
  { value: "status", label: "Status updates" },
];

export const isFeedFilter = (v: string): v is FeedFilter => FEED_FILTERS.some((f) => f.value === v);

/** Compact relative age like the reference: 4s, 12m, 3h, 2d, 5w. */
export function shortAge(createdAt: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

/** "Added a new photo", "Listed a new item", ... */
export function activityVerb(item: Pick<FeedItem, "kind" | "repost" | "images">): { lead: string; link: string | null } {
  if (item.kind === "listing") return item.repost ? { lead: "Reposted", link: "a listing" } : { lead: "Listed", link: "a new item" };
  if (item.kind === "photo") return { lead: "Added", link: item.images.length > 1 ? "new photos" : "a new photo" };
  return { lead: "Posted", link: "a status update" };
}
