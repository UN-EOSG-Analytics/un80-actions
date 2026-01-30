"use server";

import { query } from "./db/db";
import { getCurrentUser } from "../features/auth/service";
import { DB_SCHEMA } from "./db/config";
import type { ActionMilestone, MilestoneStatus, MilestoneType } from "@/types";

// =========================================================
// TYPES
// =========================================================

export interface MilestoneUpdateInput {
  description?: string | null;
  deadline?: string | null; // ISO date string (YYYY-MM-DD)
  updates?: string | null;
}

export interface MilestoneResult {
  success: boolean;
  error?: string;
  milestone?: ActionMilestone;
}

export interface MilestoneVersion {
  id: string;
  milestone_id: string;
  description: string | null;
  deadline: string | null;
  updates: string | null;
  status: MilestoneStatus;
  changed_by: string | null;
  changed_at: Date;
  change_type: string;
}

// =========================================================
// QUERIES
// =========================================================

/**
 * Fetch all milestones for a specific action.
 */
export async function getActionMilestones(
  actionId: number,
  subId?: string | null,
): Promise<ActionMilestone[]> {
  const whereClause =
    subId !== undefined
      ? "WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2)"
      : "WHERE action_id = $1";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  const rows = await query<ActionMilestone>(
    `SELECT
      id,
      action_id,
      action_sub_id,
      milestone_type,
      description,
      deadline::text,
      updates,
      status,
      submitted_by,
      submitted_by_entity,
      submitted_at,
      reviewed_by,
      reviewed_at,
      approved_by,
      approved_at
    FROM ${DB_SCHEMA}.action_milestones
    ${whereClause}
    ORDER BY
      CASE milestone_type
        WHEN 'first' THEN 1
        WHEN 'second' THEN 2
        WHEN 'third' THEN 3
        WHEN 'upcoming' THEN 4
        WHEN 'final' THEN 5
      END,
      deadline ASC NULLS LAST`,
    params,
  );

  return rows;
}

/**
 * Fetch a single milestone by ID.
 */
export async function getMilestoneById(
  milestoneId: string,
): Promise<ActionMilestone | null> {
  const rows = await query<ActionMilestone>(
    `SELECT
      id,
      action_id,
      action_sub_id,
      milestone_type,
      description,
      deadline::text,
      updates,
      status,
      submitted_by,
      submitted_by_entity,
      submitted_at,
      reviewed_by,
      reviewed_at,
      approved_by,
      approved_at
    FROM ${DB_SCHEMA}.action_milestones
    WHERE id = $1`,
    [milestoneId],
  );

  return rows[0] || null;
}

/**
 * Fetch version history for a milestone.
 */
export async function getMilestoneVersions(
  milestoneId: string,
): Promise<MilestoneVersion[]> {
  const rows = await query<MilestoneVersion>(
    `SELECT
      id,
      milestone_id,
      description,
      deadline::text,
      updates,
      status,
      changed_by,
      changed_at,
      change_type
    FROM ${DB_SCHEMA}.milestone_versions
    WHERE milestone_id = $1
    ORDER BY changed_at DESC`,
    [milestoneId],
  );

  return rows;
}

// =========================================================
// PERMISSION CHECKS
// =========================================================

/**
 * Check if user can edit milestones for a given action.
 * User must be:
 * - A focal point for the action, OR
 * - A support person for the action, OR
 * - An admin
 */
async function canEditMilestone(
  userId: string,
  userEmail: string,
  actionId: number,
  actionSubId: string | null,
): Promise<boolean> {
  // Check if user is admin
  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE email = $1`,
    [userEmail],
  );
  if (adminCheck[0]?.user_role === "Admin") {
    return true;
  }

  // Check if user is focal point or support for this action
  const permissionCheck = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM (
      SELECT 1 FROM ${DB_SCHEMA}.action_focal_points
      WHERE action_id = $1
        AND (action_sub_id IS NOT DISTINCT FROM $2)
        AND user_email = $3
      UNION ALL
      SELECT 1 FROM ${DB_SCHEMA}.action_support_persons
      WHERE action_id = $1
        AND (action_sub_id IS NOT DISTINCT FROM $2)
        AND user_email = $3
    ) AS permissions`,
    [actionId, actionSubId, userEmail],
  );

  return parseInt(permissionCheck[0]?.count || "0") > 0;
}

// =========================================================
// MUTATIONS
// =========================================================

/**
 * Update milestone content (description, deadline, updates).
 * Does NOT change status - use submitMilestone for that.
 */
export async function updateMilestone(
  milestoneId: string,
  input: MilestoneUpdateInput,
): Promise<MilestoneResult> {
  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the milestone to check permissions
  const milestone = await getMilestoneById(milestoneId);
  if (!milestone) {
    return { success: false, error: "Milestone not found" };
  }

  // Check edit permission
  const canEdit = await canEditMilestone(
    user.id,
    user.email,
    milestone.action_id,
    milestone.action_sub_id,
  );
  if (!canEdit) {
    return { success: false, error: "Not authorized to edit this milestone" };
  }

  // Only allow edits if milestone is draft or rejected
  if (milestone.status !== "draft" && milestone.status !== "rejected") {
    return {
      success: false,
      error: "Cannot edit milestone that is already submitted or approved",
    };
  }

  // Build UPDATE query dynamically based on provided fields
  const updates: string[] = [];
  const params: (string | null)[] = [];
  let paramIndex = 1;

  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(input.description);
  }
  if (input.deadline !== undefined) {
    updates.push(`deadline = $${paramIndex++}`);
    params.push(input.deadline);
  }
  if (input.updates !== undefined) {
    updates.push(`updates = $${paramIndex++}`);
    params.push(input.updates);
  }

  if (updates.length === 0) {
    return { success: false, error: "No fields to update" };
  }

  params.push(milestoneId);

  // Save current version to history before updating
  await query(
    `INSERT INTO ${DB_SCHEMA}.milestone_versions 
     (milestone_id, description, deadline, updates, status, changed_by, change_type)
     SELECT id, description, deadline, updates, status, $1, 'updated'
     FROM ${DB_SCHEMA}.action_milestones
     WHERE id = $2`,
    [user.id, milestoneId],
  );

  await query(
    `UPDATE ${DB_SCHEMA}.action_milestones
     SET ${updates.join(", ")}
     WHERE id = $${paramIndex}`,
    params,
  );

  // Return updated milestone
  const updated = await getMilestoneById(milestoneId);
  return { success: true, milestone: updated || undefined };
}

/**
 * Submit a milestone for review.
 * Changes status from 'draft' to 'submitted' and records submission metadata.
 */
export async function submitMilestone(
  milestoneId: string,
): Promise<MilestoneResult> {
  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the milestone
  const milestone = await getMilestoneById(milestoneId);
  if (!milestone) {
    return { success: false, error: "Milestone not found" };
  }

  // Check edit permission
  const canEdit = await canEditMilestone(
    user.id,
    user.email,
    milestone.action_id,
    milestone.action_sub_id,
  );
  if (!canEdit) {
    return { success: false, error: "Not authorized to submit this milestone" };
  }

  // Only allow submission from draft or rejected status
  if (milestone.status !== "draft" && milestone.status !== "rejected") {
    return {
      success: false,
      error: "Milestone has already been submitted",
    };
  }

  // Get user's entity for tracking
  const userInfo = await query<{ entity: string | null }>(
    `SELECT entity FROM ${DB_SCHEMA}.approved_users WHERE email = $1`,
    [user.email],
  );
  const userEntity = userInfo[0]?.entity || null;

  // Update milestone status
  await query(
    `UPDATE ${DB_SCHEMA}.action_milestones
     SET status = 'submitted',
         submitted_by = $1,
         submitted_by_entity = $2,
         submitted_at = NOW()
     WHERE id = $3`,
    [user.id, userEntity, milestoneId],
  );

  // Return updated milestone
  const updated = await getMilestoneById(milestoneId);
  return { success: true, milestone: updated || undefined };
}

/**
 * Save milestone as draft and submit in one action.
 * Convenience function that updates content and submits for review.
 */
export async function saveAndSubmitMilestone(
  milestoneId: string,
  input: MilestoneUpdateInput,
): Promise<MilestoneResult> {
  // First update the content
  const updateResult = await updateMilestone(milestoneId, input);
  if (!updateResult.success) {
    return updateResult;
  }

  // Then submit
  return submitMilestone(milestoneId);
}

// =========================================================
// ADMIN FUNCTIONS
// =========================================================

/**
 * Approve a submitted milestone (admin only).
 */
export async function approveMilestone(
  milestoneId: string,
): Promise<MilestoneResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE email = $1`,
    [user.email],
  );
  if (adminCheck[0]?.user_role !== "Admin") {
    return { success: false, error: "Not authorized - admin only" };
  }

  const milestone = await getMilestoneById(milestoneId);
  if (!milestone) {
    return { success: false, error: "Milestone not found" };
  }

  if (milestone.status !== "submitted" && milestone.status !== "under_review") {
    return { success: false, error: "Milestone is not pending approval" };
  }

  await query(
    `UPDATE ${DB_SCHEMA}.action_milestones
     SET status = 'approved',
         approved_by = $1,
         approved_at = NOW()
     WHERE id = $2`,
    [user.id, milestoneId],
  );

  const updated = await getMilestoneById(milestoneId);
  return { success: true, milestone: updated || undefined };
}

/**
 * Reject a submitted milestone with feedback (admin only).
 */
export async function rejectMilestone(
  milestoneId: string,
  feedback?: string,
): Promise<MilestoneResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE email = $1`,
    [user.email],
  );
  if (adminCheck[0]?.user_role !== "Admin") {
    return { success: false, error: "Not authorized - admin only" };
  }

  const milestone = await getMilestoneById(milestoneId);
  if (!milestone) {
    return { success: false, error: "Milestone not found" };
  }

  if (milestone.status !== "submitted" && milestone.status !== "under_review") {
    return { success: false, error: "Milestone is not pending approval" };
  }

  // Append rejection feedback to updates field if provided
  const updatedUpdates = feedback
    ? `${milestone.updates || ""}\n\n[Rejected]: ${feedback}`.trim()
    : milestone.updates;

  await query(
    `UPDATE ${DB_SCHEMA}.action_milestones
     SET status = 'rejected',
         updates = $1,
         reviewed_by = $2,
         reviewed_at = NOW()
     WHERE id = $3`,
    [updatedUpdates, user.id, milestoneId],
  );

  const updated = await getMilestoneById(milestoneId);
  return { success: true, milestone: updated || undefined };
}
