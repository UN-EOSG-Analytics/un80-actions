-- Migration: Add header, subtext, and date fields to action_questions
-- Run this if you already have the schema and want these fields without recreating.
-- Note: These fields are nullable for backward compatibility with existing questions.
SET search_path TO un80actions;

-- Add new columns if they do not exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_questions'
      AND column_name = 'header'
  ) THEN
    ALTER TABLE action_questions
    ADD COLUMN header text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_questions'
      AND column_name = 'subtext'
  ) THEN
    ALTER TABLE action_questions
    ADD COLUMN subtext text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_questions'
      AND column_name = 'question_date'
  ) THEN
    ALTER TABLE action_questions
    ADD COLUMN question_date date;
  END IF;
END $$;
