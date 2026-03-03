-- Migration 001: Fix ON DELETE CASCADE → SET NULL on action_milestones audit columns
--
-- submitted_by, reviewed_by, approved_by were created with ON DELETE CASCADE,
-- meaning deleting a user row would cascade-delete every milestone they touched.
-- These should be SET NULL to preserve the milestone record.
--
-- Run via DataGrip against: database=un80actions, schema=un80actions

alter table un80actions.action_milestones
    drop constraint if exists action_milestones_submitted_by_fkey,
    drop constraint if exists action_milestones_reviewed_by_fkey,
    drop constraint if exists action_milestones_approved_by_fkey;

alter table un80actions.action_milestones
    add constraint action_milestones_submitted_by_fkey
        foreign key (submitted_by) references un80actions.users (id) on delete set null,
    add constraint action_milestones_reviewed_by_fkey
        foreign key (reviewed_by) references un80actions.users (id) on delete set null,
    add constraint action_milestones_approved_by_fkey
        foreign key (approved_by) references un80actions.users (id) on delete set null;
