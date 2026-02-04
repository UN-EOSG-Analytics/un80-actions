-- Migration: Add needs_ola_review column to action_milestones
-- OLA = Office of Legal Affairs. This flag indicates the milestone is pending OLA review.

SET search_path TO un80actions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_milestones'
      AND column_name = 'needs_ola_review'
  ) THEN
    ALTER TABLE action_milestones
    ADD COLUMN needs_ola_review boolean DEFAULT false NOT NULL;
  END IF;
END $$;
