-- Migration: Add milestone_updates table for comment threads
-- This replaces the single 'updates' field on milestones with a proper comment thread system
-- Supports threaded replies and resolved status
SET search_path TO un80actions;
-- Drop existing table if it exists (to allow re-running migration)
DROP TABLE IF EXISTS milestone_updates CASCADE;
-- Create milestone_updates table
CREATE TABLE milestone_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id uuid NOT NULL REFERENCES action_milestones(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE
    SET NULL,
        content text NOT NULL,
        reply_to uuid REFERENCES milestone_updates(id) ON DELETE CASCADE,
        is_resolved boolean NOT NULL DEFAULT false,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone,
        content_review_status content_review_status NOT NULL DEFAULT 'approved',
        content_reviewed_by uuid REFERENCES users(id) ON DELETE
    SET NULL,
        content_reviewed_at timestamp with time zone
);
-- Create indexes for performance
CREATE INDEX idx_milestone_updates_milestone_id ON milestone_updates(milestone_id);
CREATE INDEX idx_milestone_updates_created_at ON milestone_updates(created_at DESC);
CREATE INDEX idx_milestone_updates_reply_to ON milestone_updates(reply_to)
WHERE reply_to IS NOT NULL;
-- Optional: Migrate existing single 'updates' field to milestone_updates table
-- Uncomment the following if you want to preserve existing updates data:
/*
 INSERT INTO milestone_updates (milestone_id, content, created_at)
 SELECT id, updates, now()
 FROM action_milestones
 WHERE updates IS NOT NULL AND updates != '';
 */
-- Note: The 'updates' column remains on action_milestones for backward compatibility
-- You can remove it later with: ALTER TABLE action_milestones DROP COLUMN updates;