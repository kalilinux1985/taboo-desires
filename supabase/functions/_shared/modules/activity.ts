import { mutation, type QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import { getCurrentUserDoc } from "../lib/auth.ts";

// Skip writes when the last heartbeat is this fresh, so idle tabs stay cheap
const HEARTBEAT_MIN_GAP_MS = 60_000;

/** Called periodically by signed-in clients; powers the "Online" badge. */
export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const row = await ctx.db.first(
      "presence",
      sql`where user_id = ${me._id}::uuid`,
    );
    // No write at all (and so no live-update broadcast) while the last beat is fresh
    if (row && ctx.now() - Date.parse(row.lastSeenAt) < HEARTBEAT_MIN_GAP_MS)
      return null;
    const now = new Date(ctx.now()).toISOString();
    await ctx.db.rows(sql`
      insert into public.presence (user_id, last_seen_at) values (${me._id}::uuid, ${now}::timestamptz)
      on conflict (user_id) do update set last_seen_at = excluded.last_seen_at`);
    return null;
  },
});

/** Counts a profile view. Owners viewing their own profile don't count. */
export const recordProfileVisit = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await getCurrentUserDoc(ctx);
    if (me?._id === userId) return null;
    if (!(await ctx.db.get("users", userId))) return null;
    await ctx.db.rows(sql`
      insert into public.profile_visits (user_id, count) values (${userId}::uuid, 1)
      on conflict (user_id) do update set count = profile_visits.count + 1`);
    return null;
  },
});

export async function getActivity(ctx: QueryCtx, userId: Id<"users">) {
  const [presence, visits] = await Promise.all([
    ctx.db.first("presence", sql`where user_id = ${userId}::uuid`),
    ctx.db.first("profileVisits", sql`where user_id = ${userId}::uuid`),
  ]);
  return {
    lastSeenAt: presence?.lastSeenAt ?? null,
    profileVisits: visits?.count ?? 0,
  };
}

export type Badge = { key: string; label: string; description: string };

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Badges are derived from existing data, so nothing extra needs to be stored. */
export async function getBadges(
  ctx: QueryCtx,
  user: Doc<"users">,
): Promise<Badge[]> {
  const [review, photo] = await Promise.all([
    ctx.db.first("reviews", sql`where reviewer_id = ${user._id}::uuid`),
    ctx.db.first("profilePhotos", sql`where user_id = ${user._id}::uuid`),
  ]);
  const details =
    user.accountType === "buyer" ? user.buyerDetails : user.sellerDetails;
  const candidates: [boolean, Badge][] = [
    [
      !!user.verified,
      {
        key: "verified",
        label: "Verified",
        description: "Identity checked by our team",
      },
    ],
    [
      ctx.now() - user._creationTime > YEAR_MS,
      {
        key: "veteran",
        label: "1 Year Member",
        description: "Member for over a year",
      },
    ],
    [
      !!user.avatarStorageId && !!user.bio,
      {
        key: "profile",
        label: "Profile Complete",
        description: "Added a picture and bio",
      },
    ],
    [
      !!details && Object.keys(details).length > 0,
      {
        key: "details",
        label: "Open Book",
        description: "Shared profile details",
      },
    ],
    [
      !!photo,
      {
        key: "photos",
        label: "Photogenic",
        description: "Posted profile photos",
      },
    ],
    [
      !!review,
      {
        key: "reviewer",
        label: "Reviewer",
        description: "Left a review for a seller",
      },
    ],
  ];
  return candidates.filter(([earned]) => earned).map(([, badge]) => badge);
}
