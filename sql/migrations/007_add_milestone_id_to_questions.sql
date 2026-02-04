-- Migration: Add milestone_id column to action_questions
-- This column allows questions to reference a specific milestone
-- Run this if you already have the schema and want this field without recreating.

SET search_path TO un80actions;

-- Add milestone_id column if it does not exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_questions'
      AND column_name = 'milestone_id'
  ) THEN
    ALTER TABLE action_questions
    ADD COLUMN milestone_id uuid REFERENCES action_milestones(id) ON DELETE SET NULL;
    
    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_action_questions_milestone_id 
    ON action_questions(milestone_id) 
    WHERE milestone_id IS NOT NULL;
  END IF;
END $$;
