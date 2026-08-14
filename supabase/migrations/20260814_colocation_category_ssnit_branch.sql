-- Widen the category check constraint to include 'SSNIT Branch'
ALTER TABLE colocation_locations
  DROP CONSTRAINT IF EXISTS colocation_locations_category_check;

ALTER TABLE colocation_locations
  ADD CONSTRAINT colocation_locations_category_check
    CHECK (category IN ('Planned', 'Operational', 'SSNIT Branch'));
