-- ── 1. Storage bucket ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-attachments', 'meeting-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload, read and delete their files
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'meeting_attach_upload' AND tablename = 'objects') THEN
    CREATE POLICY "meeting_attach_upload" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'meeting-attachments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'meeting_attach_read' AND tablename = 'objects') THEN
    CREATE POLICY "meeting_attach_read" ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = 'meeting-attachments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'meeting_attach_delete' AND tablename = 'objects') THEN
    CREATE POLICY "meeting_attach_delete" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'meeting-attachments');
  END IF;
END $$;

-- ── 2. meeting_attachments table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_attachments (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id         UUID        NOT NULL,
  meeting_type       TEXT        NOT NULL CHECK (meeting_type IN ('external', 'internal')),
  file_name          TEXT        NOT NULL,
  file_path          TEXT        NOT NULL,
  file_size          INTEGER,
  mime_type          TEXT,
  file_type          TEXT        NOT NULL DEFAULT 'document'
                                CHECK (file_type IN ('image', 'audio', 'document')),
  is_display_picture BOOLEAN     NOT NULL DEFAULT FALSE,
  uploaded_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE meeting_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_meeting_attachments" ON meeting_attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_meeting_attachments_meeting
  ON meeting_attachments(meeting_type, meeting_id, created_at);
