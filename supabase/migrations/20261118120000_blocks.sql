-- A member can block another member. Blocking removes any follow between them
-- and stops them following or messaging each other.
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create trigger blocks_broadcast
  after insert or update or delete on public.blocks
  for each row execute function app.broadcast_change();

-- No direct client access, like every other table
alter table public.blocks enable row level security;
revoke all on table public.blocks from public;
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.blocks from %I', r);
    end if;
  end loop;
end;
$$;
