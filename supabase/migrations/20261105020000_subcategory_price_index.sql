-- Sub-category pages sorted by price (newest-first uses listings_status_subcategory_created_idx).
create index if not exists listings_status_subcategory_price_idx
  on public.listings (status, subcategory, price_cents, created_at, id);
