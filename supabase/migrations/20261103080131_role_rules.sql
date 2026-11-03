-- Buyer/seller rules enforced in the database, under the api function's checks.
-- Admins (users.role = 'admin') are exempt. Data imports can skip the checks
-- with: set local app.skip_role_checks = 'on';

create or replace function app.require_account(p_user_id uuid, p_wanted text, p_what text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  u record;
begin
  if p_user_id is null or current_setting('app.skip_role_checks', true) = 'on' then
    return;
  end if;
  select account_type, role into u from public.users where id = p_user_id;
  if not found or u.role = 'admin' or u.account_type = p_wanted then
    return;
  end if;
  raise exception '%', p_what using errcode = 'insufficient_privilege';
end;
$$;

create or replace function app.enforce_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  case tg_table_name
    when 'listings' then
      perform app.require_account(new.seller_id, 'seller', 'Only sellers can create listings');
    when 'auctions' then
      perform app.require_account(new.seller_id, 'seller', 'Only sellers can run auctions');
    when 'subscriptions' then
      perform app.require_account(new.user_id, 'seller', 'Pro is for sellers');
    when 'verifications' then
      perform app.require_account(new.user_id, 'seller', 'Only seller accounts can get verified');
    when 'follows' then
      perform app.require_account(new.seller_id, 'seller', 'You can only follow sellers');
    when 'bids' then
      perform app.require_account(new.bidder_id, 'buyer', 'Only buyers can bid');
    when 'unlocks' then
      perform app.require_account(new.buyer_id, 'buyer', 'Only buyers can unlock content');
      perform app.require_account(new.seller_id, 'seller', 'Seller not found');
    when 'custom_requests' then
      perform app.require_account(new.buyer_id, 'buyer', 'Only buyers can send custom requests');
      perform app.require_account(new.seller_id, 'seller', 'Seller not found');
    when 'conversations' then
      perform app.require_account(new.buyer_id, 'buyer', 'Only buyers can contact sellers about a listing');
      perform app.require_account(new.seller_id, 'seller', 'Seller not found');
    when 'reviews' then
      perform app.require_account(new.reviewer_id, 'buyer', 'Only buyers can leave reviews');
      perform app.require_account(new.seller_id, 'seller', 'Only sellers can be reviewed');
  end case;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'listings', 'auctions', 'subscriptions', 'verifications', 'follows',
    'bids', 'unlocks', 'custom_requests', 'conversations', 'reviews'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_roles', t);
    execute format(
      'create trigger %I before insert on public.%I
         for each row execute function app.enforce_roles()',
      t || '_roles', t);
  end loop;
end;
$$;

-- Sellers can't switch back to buyer (or clear their type); only admins may change it.
create or replace function app.lock_seller_account()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.account_type = 'seller'
     and new.account_type is distinct from 'seller'
     and coalesce(new.role, '') <> 'admin'
     and coalesce(current_setting('app.skip_role_checks', true), '') <> 'on' then
    raise exception 'Seller accounts can''t switch back to buyer'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists users_lock_seller on public.users;
create trigger users_lock_seller before update of account_type on public.users
  for each row execute function app.lock_seller_account();

-- Functions get EXECUTE for PUBLIC by default; nothing outside the api needs them.
revoke execute on all functions in schema app from public;
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke execute on all functions in schema app from %I', r);
    end if;
  end loop;
end;
$$;
