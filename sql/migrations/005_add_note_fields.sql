-- Migration: Add header and note_date fields to action_notes
-- Run this if you already have the schema and want these fields without recreating.
-- Note: These fields are nullable for backward compatibility with existing notes.
SET search_path TO un80actions;

-- Add new columns if they do not exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_notes'
      AND column_name = 'header'
  ) THEN
    ALTER TABLE action_notes
    ADD COLUMN header text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_notes'
      AND column_name = 'note_date'
  ) THEN
    ALTER TABLE action_notes
    ADD COLUMN note_date date;
  END IF;
END $$;
