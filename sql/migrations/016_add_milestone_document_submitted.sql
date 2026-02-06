-- Migration: Add milestone_document_submitted column to action_milestones
-- Stores the submitted/not submitted status per milestone for the Deliverables column

SET search_path TO un80actions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_milestones'
      AND column_name = 'milestone_document_submitted'
  ) THEN
    ALTER TABLE action_milestones
    ADD COLUMN milestone_document_submitted boolean DEFAULT false NOT NULL;
  END IF;
END $$;
