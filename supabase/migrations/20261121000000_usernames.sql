-- Each member gets a unique username for their profile address (/username).
-- It comes from the shop name (or name) and follows it when that changes.
alter table public.users add column username text;

create or replace function app.make_username(base text, uid uuid) returns text
language plpgsql as $$
declare
  stem text := trim(both '-' from regexp_replace(lower(coalesce(base, '')), '[^a-z0-9]+', '-', 'g'));
  candidate text;
  n int := 1;
  reserved text[] := array[
    'admin','auctions','blocked','browse','content-policy','copyright','customs','favorites',
    'find-buyers','find-sellers','following','listing','messages','my-listings','notifications',
    'orders','pricing','privacy','report','sell','seller','settings','shop','terms','used',
    'signin','auth','api','fonts','member','members','feed','home','search','help','support'
  ];
begin
  stem := left(stem, 30);
  if stem = '' or stem = any(reserved) then
    stem := case when stem = '' then 'member' else stem || '-member' end;
  end if;
  candidate := stem;
  while exists (select 1 from public.users where username = candidate and id <> uid) or candidate = any(reserved) loop
    n := n + 1;
    candidate := stem || '-' || n;
  end loop;
  return candidate;
end;
$$;

create or replace function app.set_username() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.username is null
     or new.shop_name is distinct from old.shop_name or new.name is distinct from old.name then
    new.username := app.make_username(coalesce(nullif(new.shop_name, ''), new.name), new.id);
  end if;
  return new;
end;
$$;

-- Backfill, oldest member first so they keep the plain name
do $$
declare r record;
begin
  for r in select id, coalesce(nullif(shop_name, ''), name) as base from public.users order by created_at, id loop
    update public.users set username = app.make_username(r.base, r.id) where id = r.id;
  end loop;
end;
$$;

create trigger users_username
  before insert or update of name, shop_name, username on public.users
  for each row execute function app.set_username();

alter table public.users alter column username set not null;
create unique index users_username_key on public.users (username);
