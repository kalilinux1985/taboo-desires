-- Server-side privacy check of uploads (see functions/scrub-media).
-- A file can only be attached to a listing, post or profile once its row here says 'clean'.
create table public.media_scrubs (
  storage_id text primary key,
  status text not null check (status in ('clean', 'rejected')),
  detail text,
  checked_at timestamptz not null default now()
);
alter table public.media_scrubs enable row level security;
revoke all on table public.media_scrubs from public;
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.media_scrubs from %I', r);
    end if;
  end loop;
end;
$$;

-- Private uploads (locked videos, ID photos) get the same size cap as the upload form
update storage.buckets set file_size_limit = 209715200 where id = 'private-media';

-- Every minute, check any upload the browser didn't send for checking (including ones
-- made without the site's upload form). Older than 15 seconds so the browser's own call goes first.
select cron.schedule(
  'scrub-media-sweep',
  '* * * * *',
  $$select net.http_post(
      url := 'https://xaczugadcbhjfnjzcdoe.supabase.co/functions/v1/scrub-media',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhY3p1Z2FkY2JoamZuanpjZG9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2Mzc5NjgsImV4cCI6MjEwOTIxMzk2OH0.J4xYgtRcWtN8aSEy2SiaIBvdOwlruacz-it3PYFNBkg'
      ),
      body := jsonb_build_object('bucket', o.bucket_id, 'name', o.name),
      timeout_milliseconds := 60000
    )
    from storage.objects o
    left join public.media_scrubs s on s.storage_id = o.bucket_id || '/' || o.name
   where o.bucket_id in ('public-media', 'private-media')
     and o.created_at < now() - interval '15 seconds'
     and (s.storage_id is null or s.checked_at < o.updated_at)
   order by o.created_at
   limit 20$$
);
