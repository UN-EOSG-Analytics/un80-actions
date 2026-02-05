-- Migration: Ensure attachment_comments has user_id column
-- Fixes "column user_id does not exist" if table was created without it

SET search_path TO un80actions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'attachment_comments'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE attachment_comments
    ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
