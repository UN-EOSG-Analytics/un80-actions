-- Migration: Add activity_entries (for milestone status changes etc.) and activity_read (read/processed per user)

SET search_path TO un80actions;

-- Activity entries: explicit events (e.g. milestone status changed)
CREATE TABLE IF NOT EXISTS activity_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  type text NOT NULL,
  action_id integer NOT NULL,
  action_sub_id text,
  milestone_id uuid REFERENCES action_milestones(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_entries_created_at ON activity_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entries_action ON activity_entries (action_id, action_sub_id);

-- Which user has read which activity (any feed item id: note-x, question-x, or activity_entries.id)
CREATE TABLE IF NOT EXISTS activity_read (
  activity_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_read_user_id ON activity_read (user_id);
