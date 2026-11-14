-- Proof of age (18+) for every buyer and seller.
-- A member sends a date of birth plus a photo of a government ID and a selfie
-- holding it. Admins check them; the photos are deleted right after the review.
-- Only the date of birth and the outcome are kept. Until approved, a member
-- can browse but can't post, message, buy or list (see app/domain/accounts).

alter table public.users add column age_verified boolean not null default false;

create table public.age_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  -- underage: the member entered a date of birth under 18 (no date is kept)
  status text not null check (status in ('pending', 'approved', 'rejected', 'underage')),
  birth_date text check (birth_date ~ '^\d{4}-\d{2}-\d{2}$'),
  id_storage_id text,
  selfie_storage_id text,
  requested_at timestamptz not null,
  reviewed_at timestamptz,
  reason text check (char_length(reason) <= 300)
);
create index age_verifications_status_requested_idx
  on public.age_verifications (status, requested_at, id);

create trigger age_verifications_broadcast
  after insert or update or delete on public.age_verifications
  for each row execute function app.broadcast_change();

-- No direct client access, like every other table
alter table public.age_verifications enable row level security;
revoke all on table public.age_verifications from public;
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.age_verifications from %I', r);
    end if;
  end loop;
end;
$$;
