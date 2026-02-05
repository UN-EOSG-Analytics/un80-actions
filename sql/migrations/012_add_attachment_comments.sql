-- Migration: Add attachment_comments table for per-document comments on the Milestones tab

SET search_path TO un80actions;

CREATE TABLE IF NOT EXISTS attachment_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  attachment_id uuid NOT NULL REFERENCES action_attachments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachment_comments_attachment_id
  ON attachment_comments(attachment_id);

CREATE INDEX IF NOT EXISTS idx_attachment_comments_created_at
  ON attachment_comments(created_at);
