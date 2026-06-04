-- Add attendees field to internal_meetings, matching the attendees_external
-- pattern already used by external_meetings.
ALTER TABLE internal_meetings
  ADD COLUMN IF NOT EXISTS attendees_internal TEXT;
