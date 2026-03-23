-- Create un80actions.entities as the canonical entity list.
-- Migrates all entity FKs off systemchart.entities onto this new table.
--
-- Tables affected:
--   approved_users.entity
--   leads.entity
--   action_milestones.submitted_by_entity
--   action_member_entities.entity
-- 1. Create the new entities table
CREATE TABLE IF NOT EXISTS un80actions.entities (
    entity varchar(255) NOT NULL PRIMARY KEY,
    entity_long text
);
-- 2. Seed with union of all entity values currently in use across the app
INSERT INTO un80actions.entities (entity)
SELECT DISTINCT entity
FROM (
        SELECT entity
        FROM un80actions.approved_users
        WHERE entity IS NOT NULL
        UNION
        SELECT entity
        FROM un80actions.leads
        WHERE entity IS NOT NULL
        UNION
        SELECT submitted_by_entity
        FROM un80actions.action_milestones
        WHERE submitted_by_entity IS NOT NULL
        UNION
        SELECT entity
        FROM un80actions.action_member_entities
        WHERE entity IS NOT NULL
    ) all_entities ON CONFLICT (entity) DO NOTHING;
-- 3. approved_users.entity: drop old FK, add new one
ALTER TABLE un80actions.approved_users DROP CONSTRAINT IF EXISTS approved_users_entity_fkey;
ALTER TABLE un80actions.approved_users
ADD CONSTRAINT approved_users_entity_fkey FOREIGN KEY (entity) REFERENCES un80actions.entities (entity) ON DELETE RESTRICT;
-- 4. leads.entity: drop old FK, add new one
ALTER TABLE un80actions.leads DROP CONSTRAINT IF EXISTS leads_entity_fkey;
ALTER TABLE un80actions.leads
ADD CONSTRAINT leads_entity_fkey FOREIGN KEY (entity) REFERENCES un80actions.entities (entity) ON DELETE RESTRICT;
-- 5. action_milestones.submitted_by_entity: drop old FK, add new one
ALTER TABLE un80actions.action_milestones DROP CONSTRAINT IF EXISTS action_milestones_submitted_by_entity_fkey;
ALTER TABLE un80actions.action_milestones
ADD CONSTRAINT action_milestones_submitted_by_entity_fkey FOREIGN KEY (submitted_by_entity) REFERENCES un80actions.entities (entity) ON DELETE
SET NULL;
-- 6. action_member_entities.entity: add FK to new table
--    (the old systemchart FK was already dropped in migration 014)
ALTER TABLE un80actions.action_member_entities
ADD CONSTRAINT action_member_entities_entity_fkey FOREIGN KEY (entity) REFERENCES un80actions.entities (entity) ON DELETE RESTRICT;