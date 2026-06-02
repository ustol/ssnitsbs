-- Delete all registration, validation, and payment activity records.
DELETE FROM big_push_activities
WHERE activity_type IN ('registration', 'validation', 'payment');
