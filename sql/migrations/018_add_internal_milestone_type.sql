-- Migration: Add 'internal' milestone type and allow multiple internal milestones per action
-- Public milestones remain unique per (action_id, action_sub_id, milestone_type).
-- Internal milestones use type 'internal' and are not limited by the uniqueness constraint.
--
-- Note: If ALTER TYPE fails (e.g. "cannot run inside a transaction block"), run this once manually:
--   SET search_path TO un80actions; ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'internal';

SET search_path TO un80actions;

ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'internal';

-- Drop the existing unique constraint (one milestone type per action)
ALTER TABLE action_milestones DROP CONSTRAINT IF EXISTS action_milestones_action_type_key;

-- Enforce uniqueness only for non-internal types (first, second, third, upcoming, final)
CREATE UNIQUE INDEX IF NOT EXISTS action_milestones_action_type_key
  ON action_milestones (action_id, action_sub_id, milestone_type)
  WHERE milestone_type != 'internal';
