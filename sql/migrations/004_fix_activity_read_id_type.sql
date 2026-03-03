-- Migration 004: Fix activity_read.activity_id — cast text → uuid, add FK to activity_entries
--
-- activity_entries.id is uuid but activity_read.activity_id was text with no FK.
-- This means orphaned read-receipt rows accumulate when activity_entries rows are deleted,
-- and any string can be inserted without error.
--
-- The PK must be recreated because it includes activity_id and its type is changing.
-- All existing values are valid uuids (written by the app as uuid strings) so the cast is safe.
-- Verify first with:
--   SELECT activity_id FROM un80actions.activity_read
--   WHERE activity_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- (should return 0 rows)
--
-- Run via DataGrip against: database=un80actions, schema=un80actions

alter table un80actions.activity_read
    drop constraint activity_read_pkey;

alter table un80actions.activity_read
    alter column activity_id type uuid using activity_id::uuid;

alter table un80actions.activity_read
    add constraint activity_read_pkey primary key (activity_id, user_id),
    add constraint activity_read_activity_id_fkey
        foreign key (activity_id) references un80actions.activity_entries (id) on delete cascade;
