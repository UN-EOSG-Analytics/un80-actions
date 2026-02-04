-- Migration: Add serial_number column to action_milestones
-- This column represents the sequential number of milestones within each action
-- Run this if you already have the schema and want this field without recreating.

SET search_path TO un80actions;

-- Add serial_number column if it does not exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'un80actions'
      AND table_name = 'action_milestones'
      AND column_name = 'serial_number'
  ) THEN
    -- Add column as nullable first
    ALTER TABLE action_milestones
    ADD COLUMN serial_number integer;
    
    -- Populate serial_number for existing rows based on deadline ordering
    -- This assigns sequential numbers (1, 2, 3...) to milestones within each action
    WITH ordered_milestones AS (
      SELECT 
        id,
        action_id,
        action_sub_id,
        ROW_NUMBER() OVER (
          PARTITION BY action_id, action_sub_id 
          ORDER BY deadline ASC NULLS LAST, milestone_type
        ) as row_num
      FROM action_milestones
    )
    UPDATE action_milestones m
    SET serial_number = om.row_num
    FROM ordered_milestones om
    WHERE m.id = om.id;
    
    -- Now make it NOT NULL since we've populated all existing rows
    ALTER TABLE action_milestones
    ALTER COLUMN serial_number SET NOT NULL;
  END IF;
END $$;
