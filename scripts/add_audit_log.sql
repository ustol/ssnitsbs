-- ── audit_log table ───────────────────────────────────────────────────────────
-- Tracks every create / update / delete / file-upload action in the system.
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  user_name   TEXT,                                    -- denormalised for history accuracy
  action      TEXT        NOT NULL,                    -- 'created' | 'updated' | 'deleted' | 'uploaded_file' | 'set_display_picture'
  entity_type TEXT        NOT NULL,                    -- 'external_meeting' | 'internal_meeting' | 'partnership' | 'ddg_feedback' | 'document'
  entity_id   UUID,
  entity_name TEXT,
  changes     JSONB,                                   -- { field: { from: oldVal, to: newVal } }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read; only the system (service role) or authenticated users can insert.
CREATE POLICY "auth_read_audit"  ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_audit" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity  ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user    ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
