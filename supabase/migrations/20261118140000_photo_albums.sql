-- Photo albums on profiles, plus an optional description on each profile photo.
create table public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  unique (user_id, name)
);
create index photo_albums_user_idx on public.photo_albums (user_id, created_at);

alter table public.profile_photos
  add column album_id uuid references public.photo_albums (id) on delete set null,
  add column description text check (char_length(description) <= 300);

create trigger photo_albums_broadcast
  after insert or update or delete on public.photo_albums
  for each row execute function app.broadcast_change();

-- No direct client access, like every other table
alter table public.photo_albums enable row level security;
revoke all on table public.photo_albums from public;
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.photo_albums from %I', r);
    end if;
  end loop;
end;
$$;
