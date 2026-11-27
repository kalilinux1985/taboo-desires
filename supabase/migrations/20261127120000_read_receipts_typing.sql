-- Read receipts and typing indicators in messages.
--
-- Read receipts: when each person last read the conversation. Shown to the
-- other person only when both have read receipts on (users.read_receipts,
-- one privacy switch that also covers typing).
--
-- Typing: browsers send "typing" over a private Realtime broadcast channel
-- named 'typing:<conversation id>'. Only the conversation's buyer and seller
-- can join it, and only while their own switch is on. Nothing is stored.

alter table public.conversations
  add column buyer_read_at timestamptz,
  add column seller_read_at timestamptz;

-- Anyone with nothing unread had seen everything up to the last message
update public.conversations
   set buyer_read_at = case when not buyer_unread then last_message_at end,
       seller_read_at = case when not seller_unread then last_message_at end;

alter table public.users add column read_receipts boolean not null default true;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke update (buyer_read_at, seller_read_at) on table public.conversations from %I', r);
      execute format('revoke update (read_receipts) on table public.users from %I', r);
    end if;
  end loop;
end;
$$;

-- A small schema holding only the check Realtime runs for private channels
create schema if not exists realtime_access;
revoke all on schema realtime_access from public;

create or replace function realtime_access.can_use_typing(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.conversations c
      join public.users u on u.id in (c.buyer_id, c.seller_id)
     where topic = 'typing:' || c.id::text
       and u.token_identifier = 'supabase|' || auth.uid()::text
       and u.read_receipts
       and not exists (
         select 1 from public.blocks b
          where (b.blocker_id = c.buyer_id and b.blocked_id = c.seller_id)
             or (b.blocker_id = c.seller_id and b.blocked_id = c.buyer_id)
       )
  );
$$;
revoke all on function realtime_access.can_use_typing(text) from public;
grant usage on schema realtime_access to authenticated;
grant execute on function realtime_access.can_use_typing(text) to authenticated;

create policy "typing: conversation members can listen"
  on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and realtime_access.can_use_typing((select realtime.topic())));

create policy "typing: conversation members can send"
  on realtime.messages for insert to authenticated
  with check (realtime.messages.extension = 'broadcast' and realtime_access.can_use_typing((select realtime.topic())));
