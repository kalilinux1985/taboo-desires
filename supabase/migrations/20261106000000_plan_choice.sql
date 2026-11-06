-- Which plan length a seller picked when requesting Premium, and whether they
-- asked to pay another way (shown to admins when approving).
alter table public.subscriptions
  add column if not exists requested_months integer check (requested_months in (1, 3, 6, 12)),
  add column if not exists pay_another_way boolean not null default false;
