-- 018_notifications.sql
-- Per-user notification system replacing the old activity_entries + activity_read tables.
-- Each notification is targeted to a specific user and scoped to an action.

BEGIN;

-- Create notifications table
CREATE TABLE IF NOT EXISTS un80actions.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES un80actions.users ON DELETE CASCADE,
    type text NOT NULL,
    action_id integer NOT NULL,
    action_sub_id text NOT NULL DEFAULT '',
    title text NOT NULL,
    body text NOT NULL,
    actor_email text,
    reference_id uuid,
    reference_type text,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON un80actions.notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_all
    ON un80actions.notifications (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE un80actions.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.notifications FORCE ROW LEVEL SECURITY;

-- RLS policies: users can only see and modify their own notifications
CREATE POLICY notifications_select ON un80actions.notifications
    FOR SELECT USING (
        user_id = (
            SELECT u.id FROM un80actions.users u
            WHERE u.email = current_setting('app.current_user_email', true)
        )
    );

CREATE POLICY notifications_insert ON un80actions.notifications
    FOR INSERT WITH CHECK (true);  -- Server-side insert only, no client access

CREATE POLICY notifications_update ON un80actions.notifications
    FOR UPDATE USING (
        user_id = (
            SELECT u.id FROM un80actions.users u
            WHERE u.email = current_setting('app.current_user_email', true)
        )
    );

CREATE POLICY notifications_delete ON un80actions.notifications
    FOR DELETE USING (
        user_id = (
            SELECT u.id FROM un80actions.users u
            WHERE u.email = current_setting('app.current_user_email', true)
        )
    );

COMMIT;
