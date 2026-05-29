-- Extend activity_type check constraint to include 'inspection'
ALTER TABLE big_push_activities
  DROP CONSTRAINT IF EXISTS big_push_activities_activity_type_check;

ALTER TABLE big_push_activities
  ADD CONSTRAINT big_push_activities_activity_type_check
  CHECK (activity_type IN ('registration', 'validation', 'payment', 'inspection'));
