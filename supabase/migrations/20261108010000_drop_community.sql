-- Remove the community board: its threads and replies go with it.
drop table if exists public.replies;
drop table if exists public.threads;
