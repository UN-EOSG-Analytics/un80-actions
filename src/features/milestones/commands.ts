"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionMilestone } from "@/types";
import { getMilestoneById } from "./queries";
import { getCurrentUser } from "@/features/auth/service";

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
  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  // Get the milestone
  const milestone = await getMilestoneById(milestoneId);
  if (!milestone) {
    return { success: false, error: "Milestone not found" };
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
  // Get the milestone
  const milestone = await getMilestoneById(milestoneId);
  if (!milestone) {
    return { success: false, error: "Milestone not found" };
  }

  // Only allow submission from draft or rejected status
  if (milestone.status !== "draft" && milestone.status !== "rejected") {
    return {
      success: false,
      error: "Milestone has already been submitted",
    };
  }

  // Update milestone status
  await query(
    `UPDATE ${DB_SCHEMA}.action_milestones
     SET status = 'submitted',
         submitted_by = NULL,
         submitted_by_entity = NULL,
         submitted_at = NOW()
     WHERE id = $1`,
    [milestoneId],
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
         approved_by = NULL,
         approved_at = NOW()
     WHERE id = $1`,
    [milestoneId],
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
         reviewed_by = NULL,
         reviewed_at = NOW()
     WHERE id = $2`,
    [updatedUpdates, milestoneId],
  );

  const updated = await getMilestoneById(milestoneId);
  return { success: true, milestone: updated || undefined };
}
