-- Migration: Add comment column to action_questions
-- Allows placing an internal comment on a question (e.g. for reviewers).

SET search_path TO un80actions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_questions'
      AND column_name = 'comment'
  ) THEN
    ALTER TABLE action_questions
    ADD COLUMN comment text;
  END IF;
END $$;
