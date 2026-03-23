-- Migration 017: Public Milestone Lock
-- Non-admin users (ranks 1-4) cannot UPDATE public milestones
-- that are not in 'draft' or 'rejected' status.
-- This is defense-in-depth alongside the app-layer check in updateMilestone().
--
-- Run as un80devpgadmin80 via DataGrip.

-- Drop and recreate the UPDATE policy with a WITH CHECK clause
DROP POLICY IF EXISTS action_milestones_update ON un80actions.action_milestones;

CREATE POLICY action_milestones_update ON un80actions.action_milestones FOR UPDATE
  -- USING: who can see rows for update (ranks 0-4, same as before)
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
  )
  -- WITH CHECK: what the updated row must satisfy
  -- Admin/Legal: no restrictions
  -- Non-admin: internal milestones always OK; public milestones only if draft/rejected
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM un80actions.approved_users au
      WHERE LOWER(au.email) = current_setting('app.current_user_email', true)
        AND au.user_role IN ('Admin', 'Legal')
    )
    OR NOT action_milestones.is_public
    OR action_milestones.status IN ('draft', 'rejected')
  );
