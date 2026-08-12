ALTER TABLE colocation_locations
  ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('Planned', 'Operational'));
