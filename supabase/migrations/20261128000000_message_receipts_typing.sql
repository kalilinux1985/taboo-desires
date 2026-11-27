-- Read receipts and typing indicators for messages.
--
-- Read receipts: when each side last read the conversation. A message shows
-- "Seen" once the other person's read time is at or after it.
--
-- Typing: browsers send short "typing" events on the private Realtime
-- broadcast topic "typing:<conversation id>". Nothing is stored. The policies
-- below only let the conversation's buyer and seller join that topic.

alter table public.conversations
  add column buyer_read_at timestamptz,
  add column seller_read_at timestamptz;

-- Conversations already read count as read up to their latest message
update public.conversations set buyer_read_at = last_message_at where not buyer_unread;
update public.conversations set seller_read_at = last_message_at where not seller_unread;

-- True when the signed-in Supabase Auth user is the buyer or seller of the
-- conversation named by a "typing:<conversation id>" topic.
create or replace function app.can_use_typing_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  convo_id uuid;
begin
  if p_topic is null or p_topic !~ '^typing:[0-9a-fA-F-]{36}$' or auth.uid() is null then
    return false;
  end if;
  begin
    convo_id := substring(p_topic from 8)::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (
    select 1
      from public.conversations c
      join public.users u on u.id in (c.buyer_id, c.seller_id)
     where c.id = convo_id
       and u.token_identifier = 'supabase|' || auth.uid()::text
       and not exists (
         select 1 from public.blocks b
          where (b.blocker_id = c.buyer_id and b.blocked_id = c.seller_id)
             or (b.blocker_id = c.seller_id and b.blocked_id = c.buyer_id)
       )
  );
end;
$$;

revoke execute on function app.can_use_typing_topic(text) from public;

do $$
begin
  -- Supabase only: plain Postgres (tests) has no auth/realtime schemas
  if to_regclass('realtime.messages') is null
     or not exists (select 1 from pg_roles where rolname = 'authenticated') then
    return;
  end if;

  -- Realtime checks these policies as the signed-in user, so it needs this one function
  grant usage on schema app to authenticated;
  grant execute on function app.can_use_typing_topic(text) to authenticated;

  drop policy if exists "conversation members receive typing" on realtime.messages;
  create policy "conversation members receive typing" on realtime.messages
    for select to authenticated
    using (
      realtime.messages.extension = 'broadcast'
      and app.can_use_typing_topic(realtime.topic())
    );

  drop policy if exists "conversation members send typing" on realtime.messages;
  create policy "conversation members send typing" on realtime.messages
    for insert to authenticated
    with check (
      realtime.messages.extension = 'broadcast'
      and app.can_use_typing_topic(realtime.topic())
    );
end;
$$;
