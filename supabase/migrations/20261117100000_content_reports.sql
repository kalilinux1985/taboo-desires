-- Reports and takedown requests from anyone (members or not).
-- Non-consensual intimate images and under-18 reports are due within 48 hours
-- (TAKE IT DOWN Act); everything else within 7 days.

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  report_type text not null check (report_type in
    ('nonconsensual_intimate', 'underage', 'copyright', 'illegal', 'harassment', 'other')),
  target_kind text not null check (target_kind in ('listing', 'post', 'comment', 'profile', 'other')),
  target_id text check (char_length(target_id) <= 64),
  target_url text check (char_length(target_url) <= 500),
  description text not null check (char_length(description) <= 2000),
  reporter_name text not null check (char_length(reporter_name) <= 100),
  reporter_email text not null check (char_length(reporter_email) <= 200),
  reporter_user_id uuid references public.users (id) on delete set null,
  -- the reporter says they are the person shown, or act for them
  is_depicted boolean not null default false,
  signature text not null check (char_length(signature) <= 100),
  status text not null default 'open' check (status in ('open', 'removed', 'dismissed')),
  due_at timestamptz not null,
  resolved_at timestamptz,
  resolved_by uuid references public.users (id) on delete set null,
  resolution_note text check (char_length(resolution_note) <= 500)
);
create index content_reports_status_due_idx on public.content_reports (status, due_at, id);
create index content_reports_email_idx on public.content_reports (reporter_email, created_at);

create trigger content_reports_broadcast
  after insert or update or delete on public.content_reports
  for each row execute function app.broadcast_change();

-- No direct client access, like every other table
alter table public.content_reports enable row level security;
revoke all on table public.content_reports from public;
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.content_reports from %I', r);
    end if;
  end loop;
end;
$$;
