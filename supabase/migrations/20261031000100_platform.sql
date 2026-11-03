-- Supabase platform pieces: storage buckets and the auction-closing schedule.
-- Kept apart from the schema so tests can run the schema on plain Postgres.

-- Listing photos, blurred previews, avatars, profile and feed photos.
-- Public URLs, but paths are unguessable and only written by the api function.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-media', 'public-media', true, 10485760, array['image/*'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Locked (paid) photos and videos, and seller verification photos.
-- Never public: the api function hands out short-lived signed URLs to people
-- allowed to see them.
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('private-media', 'private-media', false, array['image/*', 'video/*'])
on conflict (id) do update
  set public = excluded.public,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policies are created on purpose: clients only upload
-- through signed upload URLs issued by the api function, and only read through
-- public or signed URLs.

-- Close finished auctions every minute.
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'close-due-auctions';
select cron.schedule('close-due-auctions', '* * * * *', $$select app.close_due_auctions()$$);
