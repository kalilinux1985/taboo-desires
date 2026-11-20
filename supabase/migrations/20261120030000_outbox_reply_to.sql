-- Per-email reply address (content reports reply to the person who reported).
alter table public.email_outbox add column reply_to text;
