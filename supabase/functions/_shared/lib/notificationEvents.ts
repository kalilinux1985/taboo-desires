// The activity that counts as a notification, as one SQL union. The bell
// (modules/notifications.ts) reads it for one member; the send-push function
// reads it for everyone who turned push notifications on. Keeping it in one
// place means a new kind of notification shows up in both.
//
// Columns: kind, at, actor_id, actor, title, target_id, amount, recipient_id.
// No imports beyond the SQL builder, so send-push can bundle it on its own.

import { empty, sql, type Sql } from "../core/sql.ts";

/**
 * @param recipients uuid[] of members to find notifications for
 * @param since only activity after this moment (an SQL timestamptz expression)
 * @param withMessages also include new direct messages (push only; the bell has its own message count)
 */
export function notificationEventsSql(recipients: string[], since: Sql, withMessages = false): Sql {
  const r = sql`${recipients}::uuid[]`;
  const messages = withMessages
    ? sql`
      union all
      -- a new direct message; target is the conversation
      select 'message', m.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), null, cv.id, null, rr.id
        from public.messages m
        join public.conversations cv on cv.id = m.conversation_id
        join public.users a on a.id = m.sender_id
        cross join lateral (values (cv.buyer_id), (cv.seller_id)) rr (id)
       where rr.id = any(${r}) and rr.id <> m.sender_id and m.created_at > ${since}`
    : empty;
  return sql`
      select 'follow' as kind, f.created_at as at, a.id as actor_id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone') as actor,
             f.status as title, null::uuid as target_id, null::int as amount, f.seller_id as recipient_id
        from public.follows f join public.users a on a.id = f.follower_id
       where f.seller_id = any(${r}) and f.created_at > ${since}
      union all
      select 'bid', b.created_at, a.id, coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'A bidder'),
             l.title, l.id, b.amount_cents, au.seller_id
        from public.bids b
        join public.auctions au on au.id = b.auction_id
        join public.listings l on l.id = au.listing_id
        left join public.users a on a.id = b.bidder_id
       where au.seller_id = any(${r}) and b.bidder_id is distinct from au.seller_id and b.created_at > ${since}
      union all
      select 'auction_won', au.ends_at, null, null, l.title, l.id, au.current_bid_cents, au.high_bidder_id
        from public.auctions au join public.listings l on l.id = au.listing_id
       where au.high_bidder_id = any(${r}) and au.status = 'ended' and au.ends_at > ${since}
      union all
      select 'custom_request', c.created_at, a.id,
             coalesce(nullif(a.name, ''), 'Anonymous buyer'), null, c.id, c.offer_cents, c.seller_id
        from public.custom_requests c join public.users a on a.id = c.buyer_id
       where c.seller_id = any(${r}) and c.created_at > ${since}
      union all
      select 'custom_answered', c.updated_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'The seller'), c.status, c.id, c.offer_cents, c.buyer_id
        from public.custom_requests c join public.users a on a.id = c.seller_id
       where c.buyer_id = any(${r}) and c.status in ('accepted', 'declined') and c.updated_at > ${since}
      union all
      select 'unlock_request', u.requested_at, a.id,
             coalesce(nullif(a.name, ''), 'Anonymous buyer'), l.title, l.id, null, u.seller_id
        from public.unlocks u
        join public.users a on a.id = u.buyer_id
        join public.listings l on l.id = u.listing_id
       where u.seller_id = any(${r}) and u.status = 'pending' and u.requested_at > ${since}
      union all
      select 'unlock_granted', u.requested_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'The seller'), l.title, l.id, null, u.buyer_id
        from public.unlocks u
        join public.users a on a.id = u.seller_id
        join public.listings l on l.id = u.listing_id
       where u.buyer_id = any(${r}) and u.status = 'granted' and u.requested_at > ${since}
      union all
      select 'review', r.updated_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'A buyer'), null, null, r.rating, r.seller_id
        from public.reviews r join public.users a on a.id = r.reviewer_id
       where r.seller_id = any(${r}) and r.updated_at > ${since}
      union all
      select 'post_like', pl.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), null, p.id, null, p.author_id
        from public.post_likes pl
        join public.posts p on p.id = pl.post_id
        join public.users a on a.id = pl.user_id
       where p.author_id = any(${r}) and pl.user_id <> p.author_id and pl.created_at > ${since}
      union all
      select 'post_comment', pc.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), null, p.id, null, p.author_id
        from public.post_comments pc
        join public.posts p on p.id = pc.post_id
        join public.users a on a.id = pc.author_id
       where p.author_id = any(${r}) and pc.author_id <> p.author_id and pc.created_at > ${since}
      union all
      -- someone liked a comment of mine; title carries the post author's id so the link can open that profile
      select 'comment_like', cl.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), p.author_id::text, p.id, null, pc.author_id
        from public.post_comment_likes cl
        join public.post_comments pc on pc.id = cl.comment_id
        join public.posts p on p.id = pc.post_id
        join public.users a on a.id = cl.user_id
       where pc.author_id = any(${r}) and cl.user_id <> pc.author_id and cl.created_at > ${since}
      union all
      -- a seller sent me a contract; target is the conversation
      select 'contract_sent', k.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'The seller'), k.item_title, k.conversation_id, k.total_cents, k.buyer_id
        from public.contracts k join public.users a on a.id = k.seller_id
       where k.buyer_id = any(${r}) and k.created_at > ${since}
      union all
      -- the buyer accepted or rejected my contract; title is the answer
      select 'contract_answered', k.responded_at, a.id,
             coalesce(nullif(a.name, ''), 'The buyer'), k.status, k.conversation_id, k.total_cents, k.seller_id
        from public.contracts k join public.users a on a.id = k.buyer_id
       where k.seller_id = any(${r}) and k.status in ('accepted', 'rejected') and k.responded_at > ${since}
      union all
      select 'contract_comment', cc.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), k.item_title, k.conversation_id, null, rr.id
        from public.contract_comments cc
        join public.contracts k on k.id = cc.contract_id
        join public.users a on a.id = cc.author_id
        cross join lateral (values (k.buyer_id), (k.seller_id)) rr (id)
       where rr.id = any(${r}) and cc.author_id <> rr.id and cc.created_at > ${since}
      union all
      -- the seller added or changed the tracking number on my order
      select 'tracking', o.tracking_updated_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'The seller'), o.title, o.id, null, o.buyer_id
        from public.orders o join public.users a on a.id = o.seller_id
       where o.buyer_id = any(${r}) and o.tracking_updated_at > ${since}${messages}`;
}
