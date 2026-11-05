// Notifications are built from activity the app already records (follows,
// bids, auction results, custom requests, unlock requests, reviews, likes,
// comments and forum replies), so nothing extra is written when they happen.
// The only stored state is when the user last opened them.

import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { getCurrentUserDoc, requireUser } from "../lib/auth.ts";

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
  | "thread_reply";

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
    "replies",
    "users",
  );
  const me = sql`${userId}::uuid`;
  const since = sql`now() - make_interval(days => ${WINDOW_DAYS}::int)`;
  const rows = await ctx.db.rows(sql`
    select * from (
      select 'follow' as kind, f.created_at as at, a.id as actor_id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone') as actor,
             null::text as title, null::uuid as target_id, null::int as amount
        from public.follows f join public.users a on a.id = f.follower_id
       where f.seller_id = ${me} and f.created_at > ${since}
      union all
      select 'bid', b.created_at, a.id, coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'A bidder'),
             l.title, l.id, b.amount_cents
        from public.bids b
        join public.auctions au on au.id = b.auction_id
        join public.listings l on l.id = au.listing_id
        left join public.users a on a.id = b.bidder_id
       where au.seller_id = ${me} and b.bidder_id is distinct from ${me} and b.created_at > ${since}
      union all
      select 'auction_won', au.ends_at, null, null, l.title, l.id, au.current_bid_cents
        from public.auctions au join public.listings l on l.id = au.listing_id
       where au.high_bidder_id = ${me} and au.status = 'ended' and au.ends_at > ${since}
      union all
      select 'custom_request', c.created_at, a.id,
             coalesce(nullif(a.name, ''), 'Anonymous buyer'), null, c.id, c.offer_cents
        from public.custom_requests c join public.users a on a.id = c.buyer_id
       where c.seller_id = ${me} and c.created_at > ${since}
      union all
      select 'custom_answered', c.updated_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'The seller'), c.status, c.id, c.offer_cents
        from public.custom_requests c join public.users a on a.id = c.seller_id
       where c.buyer_id = ${me} and c.status in ('accepted', 'declined') and c.updated_at > ${since}
      union all
      select 'unlock_request', u.requested_at, a.id,
             coalesce(nullif(a.name, ''), 'Anonymous buyer'), l.title, l.id, null
        from public.unlocks u
        join public.users a on a.id = u.buyer_id
        join public.listings l on l.id = u.listing_id
       where u.seller_id = ${me} and u.status = 'pending' and u.requested_at > ${since}
      union all
      select 'unlock_granted', u.requested_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'The seller'), l.title, l.id, null
        from public.unlocks u
        join public.users a on a.id = u.seller_id
        join public.listings l on l.id = u.listing_id
       where u.buyer_id = ${me} and u.status = 'granted' and u.requested_at > ${since}
      union all
      select 'review', r.updated_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'A buyer'), null, null, r.rating
        from public.reviews r join public.users a on a.id = r.reviewer_id
       where r.seller_id = ${me} and r.updated_at > ${since}
      union all
      select 'post_like', pl.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), null, p.id, null
        from public.post_likes pl
        join public.posts p on p.id = pl.post_id
        join public.users a on a.id = pl.user_id
       where p.author_id = ${me} and pl.user_id <> ${me} and pl.created_at > ${since}
      union all
      select 'post_comment', pc.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), null, p.id, null
        from public.post_comments pc
        join public.posts p on p.id = pc.post_id
        join public.users a on a.id = pc.author_id
       where p.author_id = ${me} and pc.author_id <> ${me} and pc.created_at > ${since}
      union all
      select 'thread_reply', rp.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), t.title, t.id, null
        from public.replies rp
        join public.threads t on t.id = rp.thread_id
        join public.users a on a.id = rp.author_id
       where t.author_id = ${me} and rp.author_id <> ${me} and rp.created_at > ${since}
    ) n
    order by at desc
    limit ${LIMIT}::int`);
  return rows.map((r) => ({
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

