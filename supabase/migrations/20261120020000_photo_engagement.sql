-- Likes and comments on profile photos (photos on activity posts use the post's own likes and comments).
create table public.photo_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  photo_id uuid not null references public.profile_photos (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  unique (photo_id, user_id)
);
create index photo_likes_photo_idx on public.photo_likes (photo_id, created_at desc);
create index photo_likes_user_idx on public.photo_likes (user_id);

create table public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  photo_id uuid not null references public.profile_photos (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500)
);
create index photo_comments_photo_idx on public.photo_comments (photo_id, created_at desc);
create index photo_comments_author_idx on public.photo_comments (author_id);

create trigger photo_likes_broadcast
  after insert or update or delete on public.photo_likes
  for each row execute function app.broadcast_change();
create trigger photo_comments_broadcast
  after insert or update or delete on public.photo_comments
  for each row execute function app.broadcast_change();

-- No direct client access, like every other table
do $$
declare
  t text;
  r text;
begin
  foreach t in array array['photo_likes', 'photo_comments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public', t);
    foreach r in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = r) then
        execute format('revoke all on table public.%I from %I', t, r);
      end if;
    end loop;
  end loop;
end;
$$;
