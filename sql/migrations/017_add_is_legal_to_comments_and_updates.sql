-- Migration: Add is_legal to milestone_updates and attachment_comments
-- Used to separate team vs legal comments/updates in the Milestone tab UI

SET search_path TO un80actions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'milestone_updates'
      AND column_name = 'is_legal'
  ) THEN
    ALTER TABLE milestone_updates
    ADD COLUMN is_legal boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'attachment_comments'
      AND column_name = 'is_legal'
  ) THEN
    ALTER TABLE attachment_comments
    ADD COLUMN is_legal boolean DEFAULT false NOT NULL;
  END IF;
END $$;
