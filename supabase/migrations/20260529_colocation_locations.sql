CREATE TABLE IF NOT EXISTS colocation_locations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  latitude    numeric(10, 7) NOT NULL,
  longitude   numeric(10, 7) NOT NULL,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_colocation_locations_created
  ON colocation_locations (created_at DESC);

ALTER TABLE colocation_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read locations"
  ON colocation_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert locations"
  ON colocation_locations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update locations"
  ON colocation_locations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete locations"
  ON colocation_locations FOR DELETE TO authenticated USING (true);
