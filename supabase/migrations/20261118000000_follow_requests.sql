-- Follows now start as a request the seller accepts or deletes.
-- Everyone already following stays accepted.
alter table public.follows
  add column status text not null default 'accepted' check (status in ('pending', 'accepted'));
create index follows_seller_status_idx on public.follows (seller_id, status);
