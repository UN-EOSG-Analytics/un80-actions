-- Migration 005: Drop dead document submission flags from action_milestones
--
-- Investigation (2026-03-03):
--   - milestone_document_submitted: 52/303 rows true — live, canonical, actively read/written
--   - document_submitted:            0/303 rows true — never written or read by app code
--   - documents_submitted:           0/303 rows true — never written or read by app code
--
-- actions.document_submitted is NOT touched here — it is actively read by the app
-- (ActionsTable, actions queries) even though all current values are false.
--
-- Run via DataGrip against: database=un80actions, schema=un80actions

alter table un80actions.action_milestones
    drop column if exists document_submitted,
    drop column if exists documents_submitted;
