-- ============================================================
-- Add status_date column to partnerships and meetings tables
-- Run once in Supabase SQL Editor
-- ============================================================

ALTER TABLE partnerships       ADD COLUMN IF NOT EXISTS status_date DATE;
ALTER TABLE external_meetings  ADD COLUMN IF NOT EXISTS status_date DATE;
ALTER TABLE internal_meetings  ADD COLUMN IF NOT EXISTS status_date DATE;

SELECT 'status_date columns added ✓' AS result;
