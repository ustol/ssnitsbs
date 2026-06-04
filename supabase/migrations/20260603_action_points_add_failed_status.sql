-- Add 'failed' to the action_points status check constraint.
-- Run this if you already applied 20260603_action_points.sql.
ALTER TABLE action_points
  DROP CONSTRAINT IF EXISTS action_points_status_check;

ALTER TABLE action_points
  ADD CONSTRAINT action_points_status_check
  CHECK (status IN ('pending', 'done', 'failed'));
