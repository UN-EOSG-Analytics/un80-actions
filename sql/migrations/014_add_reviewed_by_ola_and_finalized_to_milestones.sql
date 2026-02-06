-- Migration: Add reviewed_by_ola and finalized columns to action_milestones
-- For public milestones workflow: draft -> needs OLA review -> reviewed by OLA -> finalized

SET search_path TO un80actions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_milestones'
      AND column_name = 'reviewed_by_ola'
  ) THEN
    ALTER TABLE action_milestones
    ADD COLUMN reviewed_by_ola boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_milestones'
      AND column_name = 'finalized'
  ) THEN
    ALTER TABLE action_milestones
    ADD COLUMN finalized boolean DEFAULT false NOT NULL;
  END IF;
END $$;
