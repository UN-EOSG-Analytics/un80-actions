-- Migration: Add no_submission column to action_milestones
-- Distinguishes "No Submission" (Excel/UI) from "Draft" for internal milestones

SET search_path TO un80actions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_milestones'
      AND column_name = 'no_submission'
  ) THEN
    ALTER TABLE action_milestones
    ADD COLUMN no_submission boolean DEFAULT false NOT NULL;
  END IF;
END $$;
