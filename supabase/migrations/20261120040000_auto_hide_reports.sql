-- Content with 2 or more open reports is hidden until an admin decides.
-- Listings use a new 'hidden' status (remembering the one they had); posts and comments get a flag.
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check
  check (status in ('active', 'sold', 'ended', 'hidden'));
alter table public.listings add column hidden_prev_status text
  check (hidden_prev_status in ('active', 'sold', 'ended'));

alter table public.posts add column hidden boolean not null default false;
alter table public.post_comments add column hidden boolean not null default false;

-- Reports are looked up by what they point at
create index content_reports_target_idx on public.content_reports (target_kind, target_id) where status = 'open';
