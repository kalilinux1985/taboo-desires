-- JSON columns written by the live backend were stored as JSON strings holding
-- the real value (the driver encoded jsonb parameters twice). Unwrap them so
-- SQL can read inside them again (Instant Pics/Vids pages, Men's pages,
-- account deletion). Rows already holding objects are left alone.
update public.listings set paywall = (paywall #>> '{}')::jsonb
 where jsonb_typeof(paywall) = 'string';
update public.users set seller_details = (seller_details #>> '{}')::jsonb
 where jsonb_typeof(seller_details) = 'string';
update public.users set buyer_details = (buyer_details #>> '{}')::jsonb
 where jsonb_typeof(buyer_details) = 'string';
update public.users set settings = (settings #>> '{}')::jsonb
 where jsonb_typeof(settings) = 'string';
