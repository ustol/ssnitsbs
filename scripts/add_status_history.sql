-- ============================================================
-- Create status_history table for tracking status changes
-- Run once in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS status_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    TEXT NOT NULL CHECK (entity_type IN ('partnership','external_meeting','internal_meeting')),
  entity_id      UUID NOT NULL,
  from_status_id UUID REFERENCES status_lookup(id) ON DELETE SET NULL,
  to_status_id   UUID REFERENCES status_lookup(id) ON DELETE SET NULL,
  status_date    DATE,
  changed_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_status_history"
  ON status_history FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_status_history_entity
  ON status_history(entity_type, entity_id, created_at DESC);

SELECT 'status_history table created ✓' AS result;
