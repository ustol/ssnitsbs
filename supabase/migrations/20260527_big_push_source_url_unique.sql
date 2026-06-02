-- Add unique constraint on source_url so the cron job can upsert by URL.
-- NULL values are excluded from uniqueness checks in PostgreSQL,
-- so existing seed rows (source_url IS NULL) are not affected.
ALTER TABLE big_push_projects
ADD CONSTRAINT big_push_projects_source_url_unique UNIQUE (source_url);
