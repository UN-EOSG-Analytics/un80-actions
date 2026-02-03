-- Migration: Add reply_to to action_legal_comments for threaded replies
-- Run this if you already have the schema and want replies without recreating.
SET search_path TO un80actions;

-- Add reply_to column if it does not exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_legal_comments'
      AND column_name = 'reply_to'
  ) THEN
    ALTER TABLE action_legal_comments
    ADD COLUMN reply_to uuid REFERENCES action_legal_comments(id) ON DELETE CASCADE;
    CREATE INDEX idx_action_legal_comments_reply_to ON action_legal_comments(reply_to)
    WHERE reply_to IS NOT NULL;
  END IF;
END $$;
