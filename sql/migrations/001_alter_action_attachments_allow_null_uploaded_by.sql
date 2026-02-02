-- Migration: Update action_attachments table
-- 1. Allow NULL for uploaded_by (for uploads without authentication)
-- 2. Add title and description fields for user-friendly metadata

SET search_path TO un80actions;

-- Drop the NOT NULL constraint on uploaded_by
ALTER TABLE action_attachments 
ALTER COLUMN uploaded_by DROP NOT NULL;

-- Add title and description columns
ALTER TABLE action_attachments 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text;
