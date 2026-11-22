-- Contracts: a seller sends payment terms to a buyer in Messages; the buyer
-- accepts (which creates an order), rejects, or comments.
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  buyer_id uuid not null references public.users (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  item_title text not null check (char_length(item_title) between 1 and 120),
  item_url text check (char_length(item_url) <= 500),
  total_cents int not null check (total_cents > 0),
  payment_count int not null check (payment_count between 1 and 24),
  payment_method text check (char_length(payment_method) <= 80),
  -- [{ "dueDate": "YYYY-MM-DD", "amountCents": 1234 }, ...]
  schedule jsonb not null,
  terms text check (char_length(terms) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  responded_at timestamptz,
  order_id uuid references public.orders (id) on delete set null
);
create index contracts_conversation_idx on public.contracts (conversation_id);
create index contracts_buyer_idx on public.contracts (buyer_id, created_at desc);
create index contracts_seller_idx on public.contracts (seller_id, responded_at desc);
create index contracts_listing_idx on public.contracts (listing_id);
create index contracts_order_idx on public.contracts (order_id);

create table public.contract_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000)
);
create index contract_comments_contract_idx on public.contract_comments (contract_id, created_at);
create index contract_comments_author_idx on public.contract_comments (author_id);

alter table public.messages add column contract_id uuid references public.contracts (id) on delete set null;
create index messages_contract_idx on public.messages (contract_id) where contract_id is not null;

alter table public.orders add column contract_id uuid references public.contracts (id) on delete set null;
alter table public.orders add column tracking_updated_at timestamptz;
create index orders_contract_idx on public.orders (contract_id) where contract_id is not null;
create index orders_buyer_tracking_idx on public.orders (buyer_id, tracking_updated_at desc) where tracking_updated_at is not null;

do $$
declare
  t text;
  r text;
begin
  foreach t in array array['contracts', 'contract_comments'] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function app.broadcast_change()',
      t || '_broadcast', t);
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
