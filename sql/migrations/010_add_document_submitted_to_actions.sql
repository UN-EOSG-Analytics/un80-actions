-- Migration: Add document_submitted field to actions table
-- Run this if you already have the schema and want this field without recreating.
-- Note: This field defaults to false (not submitted) for backward compatibility.
SET search_path TO un80actions;

-- Add new column if it does not exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'actions'
      AND column_name = 'document_submitted'
  ) THEN
    ALTER TABLE actions
    ADD COLUMN document_submitted boolean DEFAULT false NOT NULL;
  END IF;
END $$;
