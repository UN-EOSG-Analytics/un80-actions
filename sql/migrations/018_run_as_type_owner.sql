-- Run this file as the OWNER of the type un80actions.milestone_type
-- (e.g. un80actions_schema_owner or postgres).
-- In PostgreSQL, only the type owner can add enum values.
--
-- After this has been run once, run 018_add_internal_milestone_type.sql
-- with your usual migration user.

SET search_path TO un80actions;

ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'internal';
