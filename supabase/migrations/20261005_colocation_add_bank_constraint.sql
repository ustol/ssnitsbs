-- Add bank check constraint to colocation_locations
ALTER TABLE colocation_locations
  ADD COLUMN IF NOT EXISTS bank text;

ALTER TABLE colocation_locations
  DROP CONSTRAINT IF EXISTS colocation_locations_bank_check;

ALTER TABLE colocation_locations
  ADD CONSTRAINT colocation_locations_bank_check
    CHECK (bank IN ('GCB', 'CBG', 'Fidelity', 'Ecobank', 'Rural/Community Bank', 'Agency'));
