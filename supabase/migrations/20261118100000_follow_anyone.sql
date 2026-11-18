-- Buyers can only follow sellers. Premium sellers can follow anyone; that rule
-- is checked in the api (it needs the plan), so the database only guards buyers.
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
      if exists (select 1 from public.users where id = new.follower_id and account_type = 'buyer') then
        perform app.require_account(new.seller_id, 'seller', 'Buyers can only follow sellers');
      end if;
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
