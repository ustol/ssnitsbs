-- Action Point Tracker
-- Stores individual action points parsed from external and internal meetings,
-- with status tracking (pending / done) and optional notes.

CREATE TABLE action_points (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      UUID        NOT NULL,
  meeting_type    TEXT        NOT NULL CHECK (meeting_type IN ('external', 'internal')),
  meeting_title   TEXT        NOT NULL,
  meeting_date    DATE,
  content         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate rows for the same line from the same meeting
  UNIQUE (meeting_id, content)
);

CREATE INDEX action_points_meeting_id_idx  ON action_points (meeting_id);
CREATE INDEX action_points_status_idx      ON action_points (status);
CREATE INDEX action_points_meeting_type_idx ON action_points (meeting_type);

-- Row-level security
ALTER TABLE action_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read action points"
  ON action_points FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert action points"
  ON action_points FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update action points"
  ON action_points FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete action points"
  ON action_points FOR DELETE TO authenticated USING (true);
