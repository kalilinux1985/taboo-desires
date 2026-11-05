-- When each user last opened their notifications; anything newer counts as unread.
alter table public.users add column if not exists notifications_seen_at timestamptz;
