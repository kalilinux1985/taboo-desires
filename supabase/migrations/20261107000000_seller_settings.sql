-- Seller settings: payment methods, offerings, notification and visibility choices.
alter table public.users add column if not exists settings jsonb not null default '{}'::jsonb;
