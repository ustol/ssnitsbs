-- Activity log for Big Push projects (registrations, validations, payments)
CREATE TABLE IF NOT EXISTS big_push_activities (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    uuid NOT NULL REFERENCES big_push_projects(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('registration', 'validation', 'payment')),
  value         numeric(18, 2) NOT NULL,
  activity_date date NOT NULL,
  notes         text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_big_push_activities_project
  ON big_push_activities (project_id, activity_type, activity_date DESC);

ALTER TABLE big_push_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activities"
  ON big_push_activities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert activities"
  ON big_push_activities FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Service role full access activities"
  ON big_push_activities FOR ALL TO service_role USING (true) WITH CHECK (true);
