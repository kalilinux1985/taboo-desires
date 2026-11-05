-- Two new categories (Clothing, Naughty extras) and a sub-category per listing.
alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings add constraint listings_category_check
  check (category in ('panties', 'bras', 'lingerie', 'socks', 'shoes', 'activewear', 'clothing', 'extras', 'custom'));
alter table public.custom_requests drop constraint if exists custom_requests_category_check;
alter table public.custom_requests add constraint custom_requests_category_check
  check (category in ('panties', 'bras', 'lingerie', 'socks', 'shoes', 'activewear', 'clothing', 'extras', 'custom'));

-- Allowed values live in supabase/functions/_shared/domain/subcategories.ts
alter table public.listings add column if not exists subcategory text
  check (subcategory is null or subcategory ~ '^[a-z_]{2,30}$');
create index if not exists listings_status_subcategory_created_idx
  on public.listings (status, subcategory, created_at, id);
