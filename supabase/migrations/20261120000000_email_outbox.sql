-- Emails waiting to be sent. Mutations only add rows here (inside their own
-- transaction, so a retried mutation never double-sends); the send-emails
-- function delivers them through Resend. dedupe_key makes each email unique.
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid references public.users (id) on delete cascade,
  to_email text not null,
  kind text not null,
  subject text not null,
  html text not null,
  text_body text not null,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,
  sent_at timestamptz
);
create index email_outbox_pending_idx on public.email_outbox (created_at) where status = 'pending';

alter table public.email_outbox enable row level security;
revoke all on table public.email_outbox from public;
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.email_outbox from %I', r);
    end if;
  end loop;
end;
$$;
