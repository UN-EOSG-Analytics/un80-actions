-- Migration: Add reply_to column to action_legal_comments
-- This enables threaded conversations in legal comments

ALTER TABLE un80actions.action_legal_comments
ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES un80actions.action_legal_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_action_legal_comments_reply_to 
ON un80actions.action_legal_comments(reply_to) 
WHERE reply_to IS NOT NULL;
