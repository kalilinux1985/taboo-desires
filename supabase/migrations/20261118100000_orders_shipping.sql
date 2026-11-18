-- Orders and prepaid shipping labels (EasyPost).
--
-- An order is one physical item a seller owes a buyer. Orders are created when
--  - a seller marks a fixed-price listing as sold to a buyer who messaged them,
--  - an auction ends with a winning bid (trigger below), or
--  - a seller accepts a custom request.
-- The buyer adds a shipping address, the seller buys a label through EasyPost,
-- prints it, and tracking updates move the order to shipped and delivered.
--
-- Addresses are only ever read by the api function: the buyer sees their own,
-- the seller only sees the city and state (the full address is on the label).

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  seller_id uuid not null references public.users (id) on delete cascade,
  buyer_id uuid not null references public.users (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  custom_request_id uuid unique references public.custom_requests (id) on delete set null,
  -- Snapshot of what was sold, so the order still reads well if the listing is deleted
  title text not null check (char_length(title) between 1 and 120),
  status text not null check (status in (
    'awaiting_address', -- buyer still has to add where it ships
    'ready_to_ship',    -- address set, no label yet
    'label_created',    -- label bought, not scanned by the carrier yet
    'shipped',          -- carrier has it (or the seller entered tracking themselves)
    'delivered',
    'cancelled'
  )),
  -- Buyer's address for this order: { name, street1, street2?, city, state, zip, country, phone? }
  ship_to jsonb,
  easypost_shipment_id text,
  carrier text check (char_length(carrier) <= 60),
  service text check (char_length(service) <= 80),
  postage_cents int check (postage_cents >= 0),
  tracking_code text check (char_length(tracking_code) <= 60),
  tracking_url text check (char_length(tracking_url) <= 500),
  -- Latest EasyPost tracker status (pre_transit, in_transit, out_for_delivery, delivered, ...)
  tracking_status text check (char_length(tracking_status) <= 40),
  label_url text check (char_length(label_url) <= 1000),
  label_created_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  updated_at timestamptz not null default clock_timestamp()
);

-- One live order per listing
create unique index orders_listing_live_idx
  on public.orders (listing_id) where listing_id is not null and status <> 'cancelled';
create index orders_seller_updated_idx on public.orders (seller_id, updated_at, id);
create index orders_buyer_updated_idx on public.orders (buyer_id, updated_at, id);
create index orders_tracking_code_idx on public.orders (tracking_code) where tracking_code is not null;

-- Saved addresses: a buyer's default ship-to and a seller's return (ship-from) address
create table public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('ship_to', 'ship_from')),
  address jsonb not null,
  updated_at timestamptz not null default clock_timestamp(),
  unique (user_id, kind)
);

create trigger orders_broadcast
  after insert or update or delete on public.orders
  for each row execute function app.broadcast_change();
create trigger shipping_addresses_broadcast
  after insert or update or delete on public.shipping_addresses
  for each row execute function app.broadcast_change();

-- An auction that ends with a winner becomes an order for the winner
create or replace function app.create_auction_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'ended' and old.status = 'live' and new.high_bidder_id is not null then
    insert into public.orders (seller_id, buyer_id, listing_id, title, status, ship_to)
    select new.seller_id, new.high_bidder_id, new.listing_id, left(l.title, 120),
           case when sa.address is null then 'awaiting_address' else 'ready_to_ship' end,
           sa.address
      from public.listings l
      left join public.shipping_addresses sa
        on sa.user_id = new.high_bidder_id and sa.kind = 'ship_to'
     where l.id = new.listing_id
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger auctions_create_order
  after update of status on public.auctions
  for each row execute function app.create_auction_order();

-- No direct client access, like every other table
alter table public.orders enable row level security;
alter table public.shipping_addresses enable row level security;
revoke all on table public.orders from public;
revoke all on table public.shipping_addresses from public;
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.orders from %I', r);
      execute format('revoke all on table public.shipping_addresses from %I', r);
      execute format('revoke all on function app.create_auction_order() from %I', r);
    end if;
  end loop;
end;
$$;
