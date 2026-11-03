-- Taboo Desires schema (migrated from Convex).
--
-- Access model: every table has row level security switched on with NO policies,
-- and the anon/authenticated roles have no table privileges. The browser never
-- reads or writes tables directly; all access goes through the `api` Edge
-- Function, which checks the signed-in user and applies the business rules
-- before running SQL as the database owner.
--
-- Conventions: uuid primary keys, `created_at` uses clock_timestamp() so rows
-- inserted in one transaction still sort in insertion order, enums are text +
-- CHECK constraints so new values only need a constraint change.

create schema if not exists app;
revoke all on schema app from public;

-- ---------------------------------------------------------------------------
-- Users and profile data
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  -- "supabase|<auth user id>" (older imported accounts: "legacy|<id>" until claimed)
  token_identifier text not null unique,
  name text,
  email text,
  shop_name text check (char_length(shop_name) <= 40),
  bio text check (char_length(bio) <= 300),
  location text check (char_length(location) <= 60),
  avatar_storage_id text,
  role text check (role in ('admin')),
  account_type text check (account_type in ('buyer', 'seller')),
  verified boolean not null default false,
  seller_details jsonb,
  buyer_details jsonb
);

create table public.presence (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  last_seen_at timestamptz not null
);

create table public.profile_visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  count integer not null default 0 check (count >= 0)
);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  photo_storage_id text,
  requested_at timestamptz not null,
  reviewed_at timestamptz,
  reason text check (char_length(reason) <= 300)
);
create index verifications_status_requested_idx on public.verifications (status, requested_at, id);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null references public.users (id) on delete cascade,
  storage_id text not null
);
create index profile_photos_user_idx on public.profile_photos (user_id, created_at);

-- One row per seller who has ever requested Pro. expires_at is null until approved.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  plan text not null default 'pro' check (plan in ('pro')),
  status text not null check (status in ('pending', 'active', 'declined', 'cancelled')),
  requested_at timestamptz not null,
  expires_at timestamptz,
  note text check (char_length(note) <= 500)
);
create index subscriptions_status_requested_idx on public.subscriptions (status, requested_at, id);
create index subscriptions_status_expires_idx on public.subscriptions (status, expires_at, id);

-- Write-time counters so profiles never count rows on read
create table public.seller_stats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  seller_id uuid not null unique references public.users (id) on delete cascade,
  follower_count integer not null default 0 check (follower_count >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  rating_sum integer not null default 0 check (rating_sum >= 0),
  sales_count integer not null default 0 check (sales_count >= 0)
);

-- ---------------------------------------------------------------------------
-- Listings, auctions, unlocks
-- ---------------------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  seller_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null check (category in ('panties', 'bras', 'lingerie', 'socks', 'shoes', 'activewear', 'custom')),
  brand text not null,
  size text not null,
  condition text not null check (condition in ('one_day', 'two_three_days', 'week', 'custom_wear')),
  -- Fixed price, or the live bid (starting bid if none) for auctions
  price_cents integer not null check (price_cents between 100 and 10000000),
  -- Public photos; for locked listings, one blurred preview per locked file
  image_ids text[] not null default '{}',
  status text not null check (status in ('active', 'sold', 'ended')),
  sale_type text not null default 'fixed' check (sale_type in ('fixed', 'auction')),
  -- {"media": [{"storageId": "...", "kind": "image" | "video"}]} for locked listings
  paywall jsonb,
  search tsvector generated always as (to_tsvector('simple', title)) stored
);
create index listings_status_created_idx on public.listings (status, created_at, id);
create index listings_status_category_created_idx on public.listings (status, category, created_at, id);
create index listings_status_price_idx on public.listings (status, price_cents, created_at, id);
create index listings_status_category_price_idx on public.listings (status, category, price_cents, created_at, id);
create index listings_seller_status_idx on public.listings (seller_id, status, created_at, id);
create index listings_search_idx on public.listings using gin (search);

create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  listing_id uuid not null unique references public.listings (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  starting_bid_cents integer not null check (starting_bid_cents > 0),
  current_bid_cents integer not null check (current_bid_cents > 0),
  bid_count integer not null default 0 check (bid_count >= 0),
  high_bidder_id uuid references public.users (id) on delete set null,
  ends_at timestamptz not null,
  status text not null check (status in ('live', 'ended'))
);
create index auctions_status_ends_idx on public.auctions (status, ends_at, id);
create index auctions_seller_idx on public.auctions (seller_id);
create index auctions_high_bidder_idx on public.auctions (high_bidder_id);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  -- Kept (anonymised) when the bidder deletes their account
  bidder_id uuid references public.users (id) on delete set null,
  amount_cents integer not null check (amount_cents > 0)
);
create index bids_auction_idx on public.bids (auction_id, created_at, id);
create index bids_bidder_idx on public.bids (bidder_id);

-- Purchase requests for locked listings; the seller grants after being paid directly
create table public.unlocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.users (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  status text not null check (status in ('pending', 'granted', 'declined')),
  requested_at timestamptz not null,
  unique (listing_id, buyer_id)
);
create index unlocks_listing_status_idx on public.unlocks (listing_id, status, created_at);
create index unlocks_buyer_seller_status_idx on public.unlocks (buyer_id, seller_id, status);
create index unlocks_seller_idx on public.unlocks (seller_id);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null references public.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  unique (user_id, listing_id)
);
create index favorites_user_created_idx on public.favorites (user_id, created_at, id);
create index favorites_listing_idx on public.favorites (listing_id);

-- ---------------------------------------------------------------------------
-- Messaging, custom requests, reviews, follows
-- ---------------------------------------------------------------------------

-- One conversation per (listing, buyer). Survives listing deletion.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  listing_id uuid references public.listings (id) on delete set null,
  buyer_id uuid not null references public.users (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  last_message_at timestamptz not null,
  last_message_preview text not null default '',
  last_sender_id uuid not null,
  buyer_unread boolean not null default false,
  seller_unread boolean not null default false,
  unique (listing_id, buyer_id)
);
create index conversations_buyer_last_idx on public.conversations (buyer_id, last_message_at);
create index conversations_seller_last_idx on public.conversations (seller_id, last_message_at);
create index conversations_buyer_unread_idx on public.conversations (buyer_id) where buyer_unread;
create index conversations_seller_unread_idx on public.conversations (seller_id) where seller_unread;
create index conversations_buyer_seller_idx on public.conversations (buyer_id, seller_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at, id);
create index messages_sender_idx on public.messages (sender_id);

create table public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  buyer_id uuid not null references public.users (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  category text not null check (category in ('panties', 'bras', 'lingerie', 'socks', 'shoes', 'activewear', 'custom')),
  wear_time text not null check (wear_time in ('one_day', 'two_three_days', 'week', 'custom_wear')),
  size text not null check (char_length(size) between 1 and 20),
  details text not null check (char_length(details) <= 1000),
  budget_cents integer not null check (budget_cents between 100 and 1000000),
  offer_cents integer not null check (offer_cents between 100 and 1000000),
  offered_by text not null check (offered_by in ('buyer', 'seller')),
  note text check (char_length(note) <= 300),
  status text not null check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  updated_at timestamptz not null
);
create index custom_requests_buyer_updated_idx on public.custom_requests (buyer_id, updated_at, id);
create index custom_requests_seller_updated_idx on public.custom_requests (seller_id, updated_at, id);
create index custom_requests_buyer_seller_status_idx on public.custom_requests (buyer_id, seller_id, status);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  seller_id uuid not null references public.users (id) on delete cascade,
  reviewer_id uuid not null references public.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  updated_at timestamptz not null,
  unique (seller_id, reviewer_id)
);
create index reviews_seller_created_idx on public.reviews (seller_id, created_at, id);
create index reviews_reviewer_created_idx on public.reviews (reviewer_id, created_at, id);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  follower_id uuid not null references public.users (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  unique (follower_id, seller_id)
);
create index follows_seller_idx on public.follows (seller_id);

-- ---------------------------------------------------------------------------
-- Community board and activity feed
-- ---------------------------------------------------------------------------

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  author_id uuid not null references public.users (id) on delete cascade,
  topic text not null check (topic in ('seller_tips', 'buyer_talk', 'introductions', 'off_topic')),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  reply_count integer not null default 0 check (reply_count >= 0),
  last_activity_at timestamptz not null
);
create index threads_last_activity_idx on public.threads (last_activity_at, id);
create index threads_topic_last_activity_idx on public.threads (topic, last_activity_at, id);
create index threads_author_idx on public.threads (author_id);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000)
);
create index replies_thread_idx on public.replies (thread_id, created_at, id);
create index replies_author_idx on public.replies (author_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  author_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('status', 'photo', 'listing')),
  body text not null default '' check (char_length(body) <= 1000),
  image_ids text[] not null default '{}' check (cardinality(image_ids) <= 4),
  listing_id uuid references public.listings (id) on delete cascade,
  -- listing posts only: true when a seller re-shared an existing listing
  repost boolean not null default false,
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0)
);
create index posts_created_idx on public.posts (created_at, id);
create index posts_kind_created_idx on public.posts (kind, created_at, id);
create index posts_kind_likes_idx on public.posts (kind, like_count, created_at, id);
create index posts_likes_idx on public.posts (like_count, created_at, id);
create index posts_author_idx on public.posts (author_id);
create index posts_listing_idx on public.posts (listing_id);

create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  unique (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500)
);
create index post_comments_post_idx on public.post_comments (post_id, created_at, id);
create index post_comments_author_idx on public.post_comments (author_id);

-- ---------------------------------------------------------------------------
-- Auction closing (run every minute by pg_cron, see the platform migration)
-- ---------------------------------------------------------------------------

-- Ends every live auction whose end time has passed. Auctions with bids become
-- "sold" (and count as a sale); auctions without bids become "ended" (unsold).
-- Late bids push ends_at out, so an extended auction is simply not due yet.
create or replace function app.close_due_auctions(p_now timestamptz default now())
returns integer
language plpgsql
set search_path = ''
as $$
declare
  closed integer;
begin
  if not exists (select 1 from public.auctions where status = 'live' and ends_at <= p_now) then
    return 0;
  end if;
  with due as (
    update public.auctions a
       set status = 'ended'
     where a.status = 'live' and a.ends_at <= p_now
    returning a.listing_id, a.bid_count
  ),
  flipped as (
    update public.listings l
       set status = case when d.bid_count > 0 then 'sold' else 'ended' end
      from due d
     where l.id = d.listing_id and l.status = 'active'
    returning l.seller_id, d.bid_count
  ),
  sales as (
    insert into public.seller_stats (seller_id, sales_count)
    select f.seller_id, count(*)::int from flipped f where f.bid_count > 0 group by f.seller_id
    on conflict (seller_id) do update
      set sales_count = public.seller_stats.sales_count + excluded.sales_count
    returning 1
  )
  select count(*) into closed from due;
  return closed;
end;
$$;

-- ---------------------------------------------------------------------------
-- Live updates: the first change to a table in a transaction broadcasts the
-- table name on the public "db-changes" Realtime topic (delivered on commit,
-- never on rollback). Browsers refetch the queries that read that table. Only
-- table names are sent, never row data. The tables written are also kept in
-- the transaction-local setting app.written so the api function can tell the
-- caller which of its own queries to refresh.
-- ---------------------------------------------------------------------------

create or replace function app.broadcast_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  written text := coalesce(current_setting('app.written', true), '');
begin
  if position(',' || tg_table_name || ',' in written) = 0 then
    perform set_config('app.written', coalesce(nullif(written, ''), ',') || tg_table_name || ',', true);
    -- realtime.send exists on Supabase; skipped on plain Postgres (tests)
    if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null then
      perform realtime.send(jsonb_build_object('table', tg_table_name), 'change', 'db-changes', false);
    end if;
  end if;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'presence', 'profile_visits', 'verifications', 'profile_photos',
    'subscriptions', 'seller_stats', 'listings', 'auctions', 'bids', 'unlocks',
    'favorites', 'conversations', 'messages', 'custom_requests', 'reviews',
    'follows', 'threads', 'replies', 'posts', 'post_likes', 'post_comments'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function app.broadcast_change()',
      t || '_broadcast', t);
    -- Lock the table down: no direct client access at all
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public', t);
  end loop;
end;
$$;

-- On Supabase the anon/authenticated roles exist and get default grants
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all functions in schema app from %I', r);
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
    end if;
  end loop;
end;
$$;
