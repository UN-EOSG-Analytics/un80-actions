-- Migration 016: Row-Level Security for scoped action access
--
-- Run as un80devpgadmin80 via DataGrip.
-- App connects as un80actions_app_user (no bypassrls) → RLS enforced.
-- Admin role (un80devpgadmin80) has bypassrls → can still query freely in DataGrip.
--
-- Identity mechanism: SET LOCAL app.current_user_email = '<email>'
-- Policies use: current_setting('app.current_user_email', true)
-- Fail-closed: if not set, returns '' → matches no email → zero rows.

BEGIN;

-- =========================================================
-- 1. ENABLE RLS ON ALL DATA TABLES
-- =========================================================
-- FORCE ensures RLS applies to the table owner too (though bypassrls overrides FORCE,
-- the app role un80actions_app_user does NOT have bypassrls).

ALTER TABLE un80actions.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.actions FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.action_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.action_milestones FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.action_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.action_notes FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.action_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.action_questions FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.action_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.action_updates FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.action_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.action_attachments FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.action_legal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.action_legal_comments FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.activity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.activity_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.activity_read ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.activity_read FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.milestone_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.milestone_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.milestone_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.milestone_updates FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.milestone_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.milestone_attachments FORCE ROW LEVEL SECURITY;

ALTER TABLE un80actions.attachment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE un80actions.attachment_comments FORCE ROW LEVEL SECURITY;


-- =========================================================
-- 2. ACTIONS TABLE
-- =========================================================

-- Read: all 6 ranks can SELECT
CREATE POLICY actions_select ON un80actions.actions FOR SELECT
  USING (
    -- Rank 0: Admin/Legal
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR
    -- Rank 1: Work package lead
    EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND wpl.work_package_id = actions.work_package_id
    )
    OR
    -- Rank 2: Work package focal point
    EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND wpfp.work_package_id = actions.work_package_id
    )
    OR
    -- Rank 3: Action lead
    EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = actions.id
        AND (al.action_sub_id IS NOT DISTINCT FROM actions.sub_id)
    )
    OR
    -- Rank 4: Action focal point
    EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = actions.id
        AND (afp.action_sub_id IS NOT DISTINCT FROM actions.sub_id)
    )
    OR
    -- Rank 5: Action member person (read-only)
    EXISTS (
      SELECT 1 FROM un80actions.action_member_persons amp
      WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
        AND amp.action_id = actions.id
        AND (amp.action_sub_id IS NOT DISTINCT FROM actions.sub_id)
    )
    OR
    -- Rank 6: Action support person (read-only)
    EXISTS (
      SELECT 1 FROM un80actions.action_support_persons asp
      WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
        AND asp.action_id = actions.id
        AND (asp.action_sub_id IS NOT DISTINCT FROM actions.sub_id)
    )
  );

-- Write: ranks 0-4 only (excludes member persons and support persons)
CREATE POLICY actions_write ON un80actions.actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR
    EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND wpl.work_package_id = actions.work_package_id
    )
    OR
    EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND wpfp.work_package_id = actions.work_package_id
    )
    OR
    EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = actions.id
        AND (al.action_sub_id IS NOT DISTINCT FROM actions.sub_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = actions.id
        AND (afp.action_sub_id IS NOT DISTINCT FROM actions.sub_id)
    )
  );


-- =========================================================
-- 3. TABLES WITH DIRECT (action_id, action_sub_id)
-- =========================================================
-- action_milestones, action_updates, action_attachments,
-- action_legal_comments, activity_entries

-- Helper: macros for the read/write access checks referencing a given action_id/action_sub_id.
-- Since PostgreSQL doesn't support policy macros, we inline the full check in each policy.

-- ---- action_milestones ----

CREATE POLICY action_milestones_select ON un80actions.action_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_milestones.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_milestones.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_milestones.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_milestones.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_member_persons amp
      WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
        AND amp.action_id = action_milestones.action_id
        AND (amp.action_sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_support_persons asp
      WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
        AND asp.action_id = action_milestones.action_id
        AND (asp.action_sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
  );

CREATE POLICY action_milestones_insert ON un80actions.action_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_milestones.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_milestones.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_milestones.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_milestones.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
  );

CREATE POLICY action_milestones_update ON un80actions.action_milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_milestones.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_milestones.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_milestones.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_milestones.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
  );

CREATE POLICY action_milestones_delete ON un80actions.action_milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_milestones.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_milestones.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_milestones.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_milestones.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_milestones.action_sub_id)
    )
  );

-- ---- action_updates ----

CREATE POLICY action_updates_select ON un80actions.action_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_updates.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_updates.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_updates.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_updates.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_member_persons amp
      WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
        AND amp.action_id = action_updates.action_id
        AND (amp.action_sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_support_persons asp
      WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
        AND asp.action_id = action_updates.action_id
        AND (asp.action_sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
  );

CREATE POLICY action_updates_write ON un80actions.action_updates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_updates.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_updates.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_updates.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_updates.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
  );

CREATE POLICY action_updates_update ON un80actions.action_updates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_updates.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_updates.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_updates.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_updates.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
  );

CREATE POLICY action_updates_delete ON un80actions.action_updates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_updates.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_updates.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_updates.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_updates.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_updates.action_sub_id)
    )
  );

-- ---- action_attachments ----

CREATE POLICY action_attachments_select ON un80actions.action_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_attachments.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_attachments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_attachments.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_attachments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_attachments.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_attachments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_attachments.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_attachments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_member_persons amp
      WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
        AND amp.action_id = action_attachments.action_id
        AND (amp.action_sub_id IS NOT DISTINCT FROM action_attachments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_support_persons asp
      WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
        AND asp.action_id = action_attachments.action_id
        AND (asp.action_sub_id IS NOT DISTINCT FROM action_attachments.action_sub_id)
    )
  );

CREATE POLICY action_attachments_write ON un80actions.action_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_attachments.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_attachments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_attachments.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_attachments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_attachments.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_attachments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_attachments.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_attachments.action_sub_id)
    )
  );

CREATE POLICY action_attachments_update ON un80actions.action_attachments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY action_attachments_delete ON un80actions.action_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

-- ---- action_legal_comments ----

CREATE POLICY action_legal_comments_select ON un80actions.action_legal_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_legal_comments.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_legal_comments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = action_legal_comments.action_id
        AND (a.sub_id IS NOT DISTINCT FROM action_legal_comments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = action_legal_comments.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM action_legal_comments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = action_legal_comments.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM action_legal_comments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_member_persons amp
      WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
        AND amp.action_id = action_legal_comments.action_id
        AND (amp.action_sub_id IS NOT DISTINCT FROM action_legal_comments.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_support_persons asp
      WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
        AND asp.action_id = action_legal_comments.action_id
        AND (asp.action_sub_id IS NOT DISTINCT FROM action_legal_comments.action_sub_id)
    )
  );

CREATE POLICY action_legal_comments_write ON un80actions.action_legal_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY action_legal_comments_update ON un80actions.action_legal_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY action_legal_comments_delete ON un80actions.action_legal_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

-- ---- activity_entries ----

CREATE POLICY activity_entries_select ON un80actions.activity_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = activity_entries.action_id
        AND (a.sub_id IS NOT DISTINCT FROM activity_entries.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = activity_entries.action_id
        AND (a.sub_id IS NOT DISTINCT FROM activity_entries.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = activity_entries.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM activity_entries.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = activity_entries.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM activity_entries.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_member_persons amp
      WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
        AND amp.action_id = activity_entries.action_id
        AND (amp.action_sub_id IS NOT DISTINCT FROM activity_entries.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_support_persons asp
      WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
        AND asp.action_id = activity_entries.action_id
        AND (asp.action_sub_id IS NOT DISTINCT FROM activity_entries.action_sub_id)
    )
  );

CREATE POLICY activity_entries_write ON un80actions.activity_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.approved_user_leads aul
      JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND a.id = activity_entries.action_id
        AND (a.sub_id IS NOT DISTINCT FROM activity_entries.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.work_package_focal_points wpfp
      JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
        AND a.id = activity_entries.action_id
        AND (a.sub_id IS NOT DISTINCT FROM activity_entries.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_leads al
      JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
        AND al.action_id = activity_entries.action_id
        AND (al.action_sub_id IS NOT DISTINCT FROM activity_entries.action_sub_id)
    )
    OR EXISTS (
      SELECT 1 FROM un80actions.action_focal_points afp
      WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
        AND afp.action_id = activity_entries.action_id
        AND (afp.action_sub_id IS NOT DISTINCT FROM activity_entries.action_sub_id)
    )
  );

CREATE POLICY activity_entries_update ON un80actions.activity_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY activity_entries_delete ON un80actions.activity_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );


-- =========================================================
-- 4. NOTES & QUESTIONS — Admin/Legal ONLY
-- =========================================================

CREATE POLICY action_notes_select ON un80actions.action_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY action_notes_write ON un80actions.action_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY action_notes_update ON un80actions.action_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY action_notes_delete ON un80actions.action_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY action_questions_select ON un80actions.action_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY action_questions_write ON un80actions.action_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY action_questions_update ON un80actions.action_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY action_questions_delete ON un80actions.action_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );


-- =========================================================
-- 5. TABLES LINKED VIA milestone_id → action_milestones
-- =========================================================
-- milestone_versions, milestone_updates, milestone_attachments
-- Must join through action_milestones to resolve action scope.

-- ---- milestone_versions ----

CREATE POLICY milestone_versions_select ON un80actions.milestone_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.action_milestones am
      WHERE am.id = milestone_versions.milestone_id
      AND (
        EXISTS (
          SELECT 1 FROM un80actions.approved_users au
          WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
            AND au.user_role IN ('Admin', 'Legal')
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.approved_user_leads aul
          JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
          JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.work_package_focal_points wpfp
          JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
          WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_leads al
          JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND al.action_id = am.action_id AND (al.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_focal_points afp
          WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
            AND afp.action_id = am.action_id AND (afp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_member_persons amp
          WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
            AND amp.action_id = am.action_id AND (amp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_support_persons asp
          WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
            AND asp.action_id = am.action_id AND (asp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
      )
    )
  );

CREATE POLICY milestone_versions_write ON un80actions.milestone_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.action_milestones am
      WHERE am.id = milestone_versions.milestone_id
      AND (
        EXISTS (
          SELECT 1 FROM un80actions.approved_users au
          WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
            AND au.user_role IN ('Admin', 'Legal')
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.approved_user_leads aul
          JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
          JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.work_package_focal_points wpfp
          JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
          WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_leads al
          JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND al.action_id = am.action_id AND (al.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_focal_points afp
          WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
            AND afp.action_id = am.action_id AND (afp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
      )
    )
  );

CREATE POLICY milestone_versions_update ON un80actions.milestone_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY milestone_versions_delete ON un80actions.milestone_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

-- ---- milestone_updates ----

CREATE POLICY milestone_updates_select ON un80actions.milestone_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.action_milestones am
      WHERE am.id = milestone_updates.milestone_id
      AND (
        EXISTS (
          SELECT 1 FROM un80actions.approved_users au
          WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
            AND au.user_role IN ('Admin', 'Legal')
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.approved_user_leads aul
          JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
          JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.work_package_focal_points wpfp
          JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
          WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_leads al
          JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND al.action_id = am.action_id AND (al.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_focal_points afp
          WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
            AND afp.action_id = am.action_id AND (afp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_member_persons amp
          WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
            AND amp.action_id = am.action_id AND (amp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_support_persons asp
          WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
            AND asp.action_id = am.action_id AND (asp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
      )
    )
  );

CREATE POLICY milestone_updates_write ON un80actions.milestone_updates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.action_milestones am
      WHERE am.id = milestone_updates.milestone_id
      AND (
        EXISTS (
          SELECT 1 FROM un80actions.approved_users au
          WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
            AND au.user_role IN ('Admin', 'Legal')
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.approved_user_leads aul
          JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
          JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.work_package_focal_points wpfp
          JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
          WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_leads al
          JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND al.action_id = am.action_id AND (al.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_focal_points afp
          WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
            AND afp.action_id = am.action_id AND (afp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
      )
    )
  );

CREATE POLICY milestone_updates_update ON un80actions.milestone_updates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.action_milestones am
      WHERE am.id = milestone_updates.milestone_id
      AND (
        EXISTS (
          SELECT 1 FROM un80actions.approved_users au
          WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
            AND au.user_role IN ('Admin', 'Legal')
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.approved_user_leads aul
          JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
          JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.work_package_focal_points wpfp
          JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
          WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_leads al
          JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND al.action_id = am.action_id AND (al.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_focal_points afp
          WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
            AND afp.action_id = am.action_id AND (afp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
      )
    )
  );

CREATE POLICY milestone_updates_delete ON un80actions.milestone_updates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

-- ---- milestone_attachments ----

CREATE POLICY milestone_attachments_select ON un80actions.milestone_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.action_milestones am
      WHERE am.id = milestone_attachments.milestone_id
      AND (
        EXISTS (
          SELECT 1 FROM un80actions.approved_users au
          WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
            AND au.user_role IN ('Admin', 'Legal')
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.approved_user_leads aul
          JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
          JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.work_package_focal_points wpfp
          JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
          WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
            AND a.id = am.action_id AND (a.sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_leads al
          JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND al.action_id = am.action_id AND (al.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_focal_points afp
          WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
            AND afp.action_id = am.action_id AND (afp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_member_persons amp
          WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
            AND amp.action_id = am.action_id AND (amp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_support_persons asp
          WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
            AND asp.action_id = am.action_id AND (asp.action_sub_id IS NOT DISTINCT FROM am.action_sub_id)
        )
      )
    )
  );

CREATE POLICY milestone_attachments_write ON un80actions.milestone_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY milestone_attachments_update ON un80actions.milestone_attachments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY milestone_attachments_delete ON un80actions.milestone_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );


-- =========================================================
-- 6. TABLES LINKED VIA attachment_id → action_attachments
-- =========================================================

-- ---- attachment_comments ----

CREATE POLICY attachment_comments_select ON un80actions.attachment_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.action_attachments aa
      WHERE aa.id = attachment_comments.attachment_id
      AND (
        EXISTS (
          SELECT 1 FROM un80actions.approved_users au
          WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
            AND au.user_role IN ('Admin', 'Legal')
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.approved_user_leads aul
          JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
          JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND a.id = aa.action_id AND (a.sub_id IS NOT DISTINCT FROM aa.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.work_package_focal_points wpfp
          JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
          WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
            AND a.id = aa.action_id AND (a.sub_id IS NOT DISTINCT FROM aa.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_leads al
          JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND al.action_id = aa.action_id AND (al.action_sub_id IS NOT DISTINCT FROM aa.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_focal_points afp
          WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
            AND afp.action_id = aa.action_id AND (afp.action_sub_id IS NOT DISTINCT FROM aa.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_member_persons amp
          WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
            AND amp.action_id = aa.action_id AND (amp.action_sub_id IS NOT DISTINCT FROM aa.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_support_persons asp
          WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
            AND asp.action_id = aa.action_id AND (asp.action_sub_id IS NOT DISTINCT FROM aa.action_sub_id)
        )
      )
    )
  );

CREATE POLICY attachment_comments_write ON un80actions.attachment_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY attachment_comments_update ON un80actions.attachment_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

CREATE POLICY attachment_comments_delete ON un80actions.attachment_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );


-- =========================================================
-- 7. ACTIVITY_READ — linked via activity_id → activity_entries
-- =========================================================

CREATE POLICY activity_read_select ON un80actions.activity_read FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.activity_entries ae
      WHERE ae.id = activity_read.activity_id
      AND (
        EXISTS (
          SELECT 1 FROM un80actions.approved_users au
          WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
            AND au.user_role IN ('Admin', 'Legal')
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.approved_user_leads aul
          JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
          JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND a.id = ae.action_id AND (a.sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.work_package_focal_points wpfp
          JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
          WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
            AND a.id = ae.action_id AND (a.sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_leads al
          JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND al.action_id = ae.action_id AND (al.action_sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_focal_points afp
          WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
            AND afp.action_id = ae.action_id AND (afp.action_sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_member_persons amp
          WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
            AND amp.action_id = ae.action_id AND (amp.action_sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_support_persons asp
          WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
            AND asp.action_id = ae.action_id AND (asp.action_sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
      )
    )
  );

-- activity_read INSERT/UPDATE/DELETE: any authenticated user can mark their own activity as read
-- within their visible scope. The SELECT policy already scopes visibility.
CREATE POLICY activity_read_write ON un80actions.activity_read FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.activity_entries ae
      WHERE ae.id = activity_read.activity_id
      AND (
        EXISTS (
          SELECT 1 FROM un80actions.approved_users au
          WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
            AND au.user_role IN ('Admin', 'Legal')
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.approved_user_leads aul
          JOIN un80actions.work_package_leads wpl ON wpl.lead_name = aul.lead_name
          JOIN un80actions.actions a ON a.work_package_id = wpl.work_package_id
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND a.id = ae.action_id AND (a.sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.work_package_focal_points wpfp
          JOIN un80actions.actions a ON a.work_package_id = wpfp.work_package_id
          WHERE LOWER(wpfp.user_email) = current_setting('app.current_user_email', true)
            AND a.id = ae.action_id AND (a.sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_leads al
          JOIN un80actions.approved_user_leads aul ON aul.lead_name = al.lead_name
          WHERE LOWER(aul.user_email) = current_setting('app.current_user_email', true)
            AND al.action_id = ae.action_id AND (al.action_sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_focal_points afp
          WHERE LOWER(afp.user_email) = current_setting('app.current_user_email', true)
            AND afp.action_id = ae.action_id AND (afp.action_sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_member_persons amp
          WHERE LOWER(amp.user_email) = current_setting('app.current_user_email', true)
            AND amp.action_id = ae.action_id AND (amp.action_sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
        OR EXISTS (
          SELECT 1 FROM un80actions.action_support_persons asp
          WHERE LOWER(asp.user_email) = current_setting('app.current_user_email', true)
            AND asp.action_id = ae.action_id AND (asp.action_sub_id IS NOT DISTINCT FROM ae.action_sub_id)
        )
      )
    )
  );

CREATE POLICY activity_read_delete ON un80actions.activity_read FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
  );

COMMIT;
