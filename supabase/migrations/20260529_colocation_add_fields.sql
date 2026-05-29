ALTER TABLE colocation_locations
  ADD COLUMN IF NOT EXISTS ssnit_branch      text,
  ADD COLUMN IF NOT EXISTS bank              text,
  ADD COLUMN IF NOT EXISTS commencement_date date;
