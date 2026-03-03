-- Migration 003: Drop dead columns from attachment_comments
--
-- Investigation confirmed:
--   - author_id: never written to by the app (always NULL)
--   - body:      always written with the same value as comment ($3, $3 in INSERT)
--                and only used as a fallback in reads (comment ?? body) — comment always wins
--
-- Canonical columns are: user_id (identity) and comment (content).
-- App code is updated in the same commit to remove body from INSERT/SELECT.
--
-- Run via DataGrip against: database=un80actions, schema=un80actions

alter table un80actions.attachment_comments
    drop column if exists author_id,
    drop column if exists body;
