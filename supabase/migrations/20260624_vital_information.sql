CREATE TABLE IF NOT EXISTS vital_information (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                 DATE NOT NULL,
  subject              TEXT NOT NULL,
  details              TEXT,
  partnership_id       UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  external_meeting_id  UUID REFERENCES external_meetings(id) ON DELETE SET NULL,
  internal_meeting_id  UUID REFERENCES internal_meetings(id) ON DELETE SET NULL,
  created_by           UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vital_information_single_meeting CHECK (
    NOT (external_meeting_id IS NOT NULL AND internal_meeting_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_vital_information_partnership ON vital_information(partnership_id);
CREATE INDEX IF NOT EXISTS idx_vital_information_external_meeting ON vital_information(external_meeting_id);
CREATE INDEX IF NOT EXISTS idx_vital_information_internal_meeting ON vital_information(internal_meeting_id);

ALTER TABLE vital_information ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vital_information_select" ON vital_information FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "vital_information_insert" ON vital_information FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "vital_information_update" ON vital_information FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "vital_information_delete" ON vital_information FOR DELETE USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_vital_information_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_vital_information_updated_at
  BEFORE UPDATE ON vital_information
  FOR EACH ROW EXECUTE FUNCTION update_vital_information_updated_at();
