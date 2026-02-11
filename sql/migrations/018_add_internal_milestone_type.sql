-- Migration: Allow multiple internal milestones per action (type 'internal').
-- Public milestones remain unique per (action_id, action_sub_id, milestone_type).
--
-- PREREQUISITE: The enum value 'internal' must exist on un80actions.milestone_type.
-- Only the type owner can add enum values. Run this once as the type owner
-- (e.g. un80actions_schema_owner or postgres):
--
--   sql/migrations/018_run_as_type_owner.sql
--
-- Or manually: ALTER TYPE un80actions.milestone_type ADD VALUE IF NOT EXISTS 'internal';
--
-- Then run this file with your usual migration user.

SET search_path TO un80actions;

-- Drop the existing unique constraint (one milestone type per action)
ALTER TABLE action_milestones DROP CONSTRAINT IF EXISTS action_milestones_action_type_key;

-- Enforce uniqueness only for non-internal types (first, second, third, upcoming, final)
CREATE UNIQUE INDEX IF NOT EXISTS action_milestones_action_type_key
  ON action_milestones (action_id, action_sub_id, milestone_type)
  WHERE milestone_type != 'internal';
