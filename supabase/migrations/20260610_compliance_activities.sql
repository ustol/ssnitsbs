CREATE TABLE IF NOT EXISTS compliance_activities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_name  TEXT NOT NULL,
  er_no               TEXT,
  date_registered     DATE,
  coverable_date      DATE,
  labour_force        INTEGER,
  actual_contributions NUMERIC(15,2) DEFAULT 0,
  penalty             NUMERIC(15,2) DEFAULT 0,
  total               NUMERIC(15,2) GENERATED ALWAYS AS (COALESCE(actual_contributions,0) + COALESCE(penalty,0)) STORED,
  enforcement_branch  TEXT,
  remarks             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE compliance_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_activities_select" ON compliance_activities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "compliance_activities_insert" ON compliance_activities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "compliance_activities_update" ON compliance_activities FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "compliance_activities_delete" ON compliance_activities FOR DELETE USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_compliance_activities_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_compliance_activities_updated_at
  BEFORE UPDATE ON compliance_activities
  FOR EACH ROW EXECUTE FUNCTION update_compliance_activities_updated_at();
