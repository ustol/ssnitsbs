-- Run this in the Supabase SQL Editor to fix image display.
--
-- The meeting-attachments bucket was created with ON CONFLICT DO NOTHING,
-- which means if it existed before, public=true was never applied.
-- This sets it correctly and removes the need for signed URLs.

-- 1. Force the bucket to public
UPDATE storage.buckets
SET public = true
WHERE id = 'meeting-attachments';

-- 2. Ensure authenticated users can upload / read / delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'meeting_attach_upload' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "meeting_attach_upload" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'meeting-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'meeting_attach_read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "meeting_attach_read" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'meeting-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'meeting_attach_delete' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "meeting_attach_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'meeting-attachments');
  END IF;
END $$;
