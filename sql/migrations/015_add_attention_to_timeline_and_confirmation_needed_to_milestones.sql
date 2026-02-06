-- Migration: Add attention_to_timeline and confirmation_needed columns to action_milestones
-- For internal milestones workflow: draft -> attention to timeline -> confirmation needed -> finalized

SET search_path TO un80actions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_milestones'
      AND column_name = 'attention_to_timeline'
  ) THEN
    ALTER TABLE action_milestones
    ADD COLUMN attention_to_timeline boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_milestones'
      AND column_name = 'confirmation_needed'
  ) THEN
    ALTER TABLE action_milestones
    ADD COLUMN confirmation_needed boolean DEFAULT false NOT NULL;
  END IF;
END $$;
