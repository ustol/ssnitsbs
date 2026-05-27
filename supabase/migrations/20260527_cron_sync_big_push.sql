-- ─── Enable required extensions ────────────────────────────────────────────────
-- pg_cron: runs scheduled jobs inside Postgres
-- pg_net:  makes async HTTP calls from Postgres (to trigger Edge Functions)
-- Both are available on Supabase Pro and above.
-- On Free plan, use the Supabase Dashboard > Edge Functions > Schedule tab instead.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── Remove old schedule if re-running ─────────────────────────────────────────
SELECT cron.unschedule('sync-big-push-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-big-push-daily'
);

-- ─── Schedule: every day at 06:00 UTC ──────────────────────────────────────────
-- Replace <YOUR_SERVICE_ROLE_KEY> with your actual service role key from
-- Supabase dashboard → Settings → API → service_role secret.
-- (This key lives only in the database and is never exposed to the browser.)

SELECT cron.schedule(
  'sync-big-push-daily',
  '0 6 * * *',
  format(
    $$
    SELECT net.http_post(
      url     := %L,
      headers := %L::jsonb,
      body    := '{}'::jsonb
    );
    $$,
    'https://addwpccnvdwglikeuyga.supabase.co/functions/v1/sync-big-push',
    json_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    )::text
  )
);

-- ─── Store your service role key as a GUC (once, as superuser) ─────────────────
-- Run this line separately after replacing the placeholder:
--
-- ALTER DATABASE postgres SET app.service_role_key = '<YOUR_SERVICE_ROLE_KEY>';
--
-- Then run: SELECT pg_reload_conf();
-- After that, pg_cron can read it via current_setting('app.service_role_key').

-- ─── Verify schedule was created ────────────────────────────────────────────────
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'sync-big-push-daily';
