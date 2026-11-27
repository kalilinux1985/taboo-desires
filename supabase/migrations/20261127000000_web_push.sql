-- Web push: one row per browser or phone a member turned notifications on for.
-- The send-push function checks every minute for new notifications and
-- messages since each member's push_checked_at and sends a short alert.
-- The VAPID key pair lives in Supabase Vault (name 'vapid_keys'); the backend
-- creates it the first time someone turns notifications on.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  last_sent_at timestamptz,
  failures int not null default 0
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Where the last push check for each member stopped
alter table public.users add column push_checked_at timestamptz;

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from public;
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.push_subscriptions from %I', r);
      execute format('revoke update (push_checked_at) on table public.users from %I', r);
    end if;
  end loop;
end;
$$;

-- Run the send-push function every minute. The publishable (anon) key is
-- public by design; it only gets the request past the function gateway.
select cron.schedule(
  'send-push',
  '* * * * *',
  $$select net.http_post(
    url := 'https://xaczugadcbhjfnjzcdoe.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhY3p1Z2FkY2JoamZuanpjZG9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2Mzc5NjgsImV4cCI6MjEwOTIxMzk2OH0.J4xYgtRcWtN8aSEy2SiaIBvdOwlruacz-it3PYFNBkg'
    ),
    body := '{}'::jsonb
  )$$
);
