-- Taboo Coins: 1 coin = $0.01 when spent. Members buy packs (once a payment
-- processor is connected; admins can grant coins until then), pay for items
-- and Instant Content with them, and sellers receive the coins.
alter table public.users add column coin_balance int not null default 0 check (coin_balance >= 0);

create table public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null references public.users (id) on delete cascade,
  delta int not null check (delta <> 0),
  balance_after int not null check (balance_after >= 0),
  kind text not null check (kind in ('pack', 'grant', 'purchase', 'sale', 'unlock', 'unlock_sale', 'refund', 'refund_sale')),
  listing_id uuid references public.listings (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  actor_id uuid references public.users (id) on delete set null,
  note text check (char_length(note) <= 200)
);
create index coin_ledger_user_idx on public.coin_ledger (user_id, created_at desc);
create index coin_ledger_listing_idx on public.coin_ledger (listing_id) where listing_id is not null;
create index coin_ledger_order_idx on public.coin_ledger (order_id) where order_id is not null;
create index coin_ledger_actor_idx on public.coin_ledger (actor_id) where actor_id is not null;

-- Orders paid with coins remember how many (for refunds)
alter table public.orders add column coin_amount int check (coin_amount > 0);

create trigger coin_ledger_broadcast
  after insert or update or delete on public.coin_ledger
  for each row execute function app.broadcast_change();

alter table public.coin_ledger enable row level security;
revoke all on table public.coin_ledger from public;
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.coin_ledger from %I', r);
      -- Balances only change through the backend
      execute format('revoke update (coin_balance) on table public.users from %I', r);
    end if;
  end loop;
end;
$$;
