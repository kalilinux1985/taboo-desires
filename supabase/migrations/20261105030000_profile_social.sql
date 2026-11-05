-- Seller profile: comment replies and likes, a seller's own posts, direct messages.

-- Replies are comments with a parent (one level deep); counts are kept on the comment
alter table public.post_comments
  add column if not exists parent_id uuid references public.post_comments (id) on delete cascade,
  add column if not exists like_count integer not null default 0 check (like_count >= 0),
  add column if not exists reply_count integer not null default 0 check (reply_count >= 0);
create index if not exists post_comments_parent_idx
  on public.post_comments (parent_id, created_at, id) where parent_id is not null;
create index if not exists post_comments_top_idx
  on public.post_comments (post_id, created_at, id) where parent_id is null;

create table if not exists public.post_comment_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  unique (comment_id, user_id)
);
create index if not exists post_comment_likes_user_idx on public.post_comment_likes (user_id);

drop trigger if exists post_comment_likes_broadcast on public.post_comment_likes;
create trigger post_comment_likes_broadcast after insert or update or delete on public.post_comment_likes
  for each row execute function app.broadcast_change();
-- Same lockdown as every other table: no direct browser access
alter table public.post_comment_likes enable row level security;
revoke all on table public.post_comment_likes from public;
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.post_comment_likes from %I', r);
    end if;
  end loop;
end;
$$;

-- "Latest activity" on a profile: one author's posts, newest first
create index if not exists posts_author_created_idx on public.posts (author_id, created_at, id);

-- Finding a buyer's direct conversation with a seller (no listing). Not unique:
-- conversations whose listing was deleted also have no listing.
create index if not exists conversations_direct_idx
  on public.conversations (buyer_id, seller_id) where listing_id is null;
