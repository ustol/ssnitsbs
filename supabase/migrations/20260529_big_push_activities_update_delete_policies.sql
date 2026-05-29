-- Allow authenticated users to update and delete their own (and any) activity records
CREATE POLICY "Authenticated users can update activities"
  ON big_push_activities FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete activities"
  ON big_push_activities FOR DELETE TO authenticated
  USING (true);
