-- ============================================================
-- Seed the 5 Status Tracker status options into status_lookup
-- Run this once in the Supabase SQL Editor
-- Safe to run multiple times (ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO status_lookup (name, color, sort_order) VALUES
  ('Initial Letter Sent',         '#6366f1', 10),
  ('Initial Meeting',             '#0ea5e9', 20),
  ('Follow-Up Meeting',           '#f59e0b', 30),
  ('Request for more Information','#8b5cf6', 40),
  ('Other',                       '#6b7280', 50)
ON CONFLICT DO NOTHING;

SELECT name, color FROM status_lookup ORDER BY sort_order;
