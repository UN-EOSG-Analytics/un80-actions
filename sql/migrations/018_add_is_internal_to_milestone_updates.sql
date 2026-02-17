-- Migration: Add is_internal to milestone_updates
-- Admin-only comments for internal milestones (visible/editable only by admins).
-- Team updates & comments: is_legal = false, is_internal = false.
-- Internal comments: is_legal = false, is_internal = true (admin-only).
-- Uses fully qualified table name so it works regardless of search_path.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'milestone_updates'
      AND column_name = 'is_internal'
  ) THEN
    ALTER TABLE un80actions.milestone_updates
    ADD COLUMN is_internal boolean DEFAULT false NOT NULL;
  END IF;
END $$;
