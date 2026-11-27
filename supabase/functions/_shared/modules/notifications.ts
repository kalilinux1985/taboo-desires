// Notifications are built from activity the app already records (follows,
// bids, auction results, custom requests, unlock requests, reviews, likes
// and comments), so nothing extra is written when they happen. The SQL lives
// in lib/notificationEvents.ts, shared with push notifications.
// The only stored state is when the user last opened them.

import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { getCurrentUserDoc, requireUser } from "../lib/auth.ts";
import { notificationEventsSql } from "../lib/notificationEvents.ts";

export type NotificationKind =
  | "follow"
  | "bid"
  | "auction_won"
  | "custom_request"
  | "custom_answered"
  | "unlock_request"
  | "unlock_granted"
  | "review"
  | "post_like"
  | "post_comment"
  | "comment_like"
  | "contract_sent"
  | "contract_answered"
  | "contract_comment"
  | "tracking";

const WINDOW_DAYS = 30;
const LIMIT = 50;

async function recentFor(ctx: QueryCtx, userId: Id<"users">) {
  ctx.db.touch(
    "follows",
    "bids",
    "auctions",
    "customRequests",
    "unlocks",
    "reviews",
    "postLikes",
    "postComments",
    "postCommentLikes",
    "contracts",
    "contractComments",
    "orders",
    "users",
  );
  const since = sql`now() - make_interval(days => ${WINDOW_DAYS}::int)`;
  const rows = await ctx.db.rows(sql`
    select * from (${notificationEventsSql([userId], since)}) n
    order by at desc
    limit ${LIMIT}::int`);
  // Profile pictures of the people behind the notifications
  const actorIds = [...new Set(rows.map((r) => r.actor_id as string | null).filter((id): id is string => !!id))];
  const avatars = new Map<string, string | null>();
  await Promise.all(
    actorIds.map(async (id) => {
      const u = await ctx.db.get("users", id as Id<"users">);
      avatars.set(id, u?.avatarStorageId ? await ctx.storage.getUrl(u.avatarStorageId) : null);
    }),
  );
  return rows.map((r) => ({
    actorAvatarUrl: (r.actor_id ? avatars.get(r.actor_id as string) : null) ?? null,
    kind: r.kind as NotificationKind,
    at: new Date(r.at as string).getTime(),
    actorId: (r.actor_id as Id<"users"> | null) ?? null,
    actor: (r.actor as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    targetId: (r.target_id as string | null) ?? null,
    amountCents: r.amount == null ? null : Number(r.amount),
  }));
}

async function seenAt(ctx: QueryCtx, userId: Id<"users">): Promise<number> {
  const [row] = await ctx.db.rows(
    sql`select notifications_seen_at from public.users where id = ${userId}::uuid`,
  );
  const value = row?.notifications_seen_at;
  return value ? new Date(value as string).getTime() : 0;
}

/** Recent notifications, newest first, each marked unread if newer than the last visit. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const [items, seen] = await Promise.all([
      recentFor(ctx, me._id),
      seenAt(ctx, me._id),
    ]);
    return items.map((n) => ({ ...n, unread: n.at > seen }));
  },
});

/** Number of notifications since the user last opened the page (for the bell). */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return 0;
    const [items, seen] = await Promise.all([
      recentFor(ctx, me._id),
      seenAt(ctx, me._id),
    ]);
    return items.filter((n) => n.at > seen).length;
  },
});

/** Called when the notifications page opens. */
export const markSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    await ctx.db.rows(
      sql`update public.users set notifications_seen_at = now() where id = ${me._id}::uuid`,
    );
    return null;
  },
});

