-- Buyers follow sellers only; sellers follow buyers only.
create or replace function app.enforce_follow()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  f_type text;
  t_type text;
begin
  if current_setting('app.skip_role_checks', true) = 'on' then
    return new;
  end if;
  select account_type into f_type from public.users where id = new.follower_id and role is distinct from 'admin';
  select account_type into t_type from public.users where id = new.seller_id;
  if f_type = 'buyer' and t_type is distinct from 'seller' then
    raise exception 'Buyers can only follow sellers' using errcode = 'insufficient_privilege';
  end if;
  if f_type = 'seller' and t_type is distinct from 'buyer' then
    raise exception 'Sellers can only follow buyers' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- The generic role trigger no longer handles follows
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

drop trigger if exists follows_roles on public.follows;
drop trigger if exists follows_follow_rules on public.follows;
create trigger follows_follow_rules before insert on public.follows
  for each row execute function app.enforce_follow();

revoke execute on function app.enforce_follow() from public;
