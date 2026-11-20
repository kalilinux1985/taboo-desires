-- Run the send-emails function every minute. The publishable (anon) key is
-- public by design; it only gets the request past the function gateway.
create extension if not exists pg_net;

select cron.schedule(
  'send-emails',
  '* * * * *',
  $$select net.http_post(
    url := 'https://xaczugadcbhjfnjzcdoe.supabase.co/functions/v1/send-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhY3p1Z2FkY2JoamZuanpjZG9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2Mzc5NjgsImV4cCI6MjEwOTIxMzk2OH0.J4xYgtRcWtN8aSEy2SiaIBvdOwlruacz-it3PYFNBkg'
    ),
    body := '{}'::jsonb
  )$$
);
