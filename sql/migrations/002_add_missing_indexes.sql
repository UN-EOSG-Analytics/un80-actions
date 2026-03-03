-- Migration 002: Add missing composite indexes on high-traffic content tables
--
-- action_notes, action_questions, action_updates are queried by (action_id, action_sub_id)
-- on every action modal load but had no index — unlike action_legal_comments and
-- action_attachments which already have this index.
--
-- Also adds:
--   - email + expires_at indexes on magic_tokens (hit on every auth flow)
--   - partial index on activity_entries.milestone_id (milestone activity feeds)
--
-- All statements are purely additive — no data is modified.
--
-- Run via DataGrip against: database=un80actions, schema=un80actions

-- Content tables
create index if not exists idx_action_notes_action
    on un80actions.action_notes (action_id, action_sub_id);

create index if not exists idx_action_questions_action
    on un80actions.action_questions (action_id, action_sub_id);

create index if not exists idx_action_updates_action
    on un80actions.action_updates (action_id, action_sub_id);

-- Auth
create index if not exists idx_magic_tokens_email
    on un80actions.magic_tokens (email);

create index if not exists idx_magic_tokens_expires_at
    on un80actions.magic_tokens (expires_at);

-- Activity feeds
create index if not exists idx_activity_entries_milestone_id
    on un80actions.activity_entries (milestone_id)
    where milestone_id is not null;
