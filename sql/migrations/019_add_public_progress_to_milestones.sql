-- Migration: Add public_progress column to action_milestones
-- For public milestones only: "Completed", "In progress", or "Delayed"

SET search_path TO un80actions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_milestones'
      AND column_name = 'public_progress'
  ) THEN
    ALTER TABLE action_milestones
    ADD COLUMN public_progress text
      CHECK (public_progress IS NULL OR public_progress IN ('completed', 'in_progress', 'delayed'));
  END IF;
END $$;
