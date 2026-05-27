-- Big Push Infrastructure Programme data table
CREATE TABLE IF NOT EXISTS big_push_projects (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title            text NOT NULL,
  contractor       text,
  contract_sum     text,
  start_date       text,
  exp_completion_date text,
  current_progress text,
  agency           text,
  region           text,
  source_url       text,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE big_push_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read big_push_projects"
  ON big_push_projects FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role full access big_push_projects"
  ON big_push_projects FOR ALL
  TO service_role USING (true) WITH CHECK (true);
