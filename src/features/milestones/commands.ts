"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionMilestone } from "@/types";
import { getMilestoneById } from "./queries";
import { getCurrentUser } from "@/features/auth/service";
import { insertActivityEntry } from "@/features/activity/commands";

function getMilestoneStatusLabel(m: ActionMilestone): string {
  if (m.is_draft) return "Draft";
  if (m.finalized) return "Finalized";
  if (m.confirmation_needed) return "Confirmation needed";
  if (m.attention_to_timeline) return "Attention to timeline";
  if (m.reviewed_by_ola) return "Reviewed by OLA";
  if (m.is_approved) return "Approved";
  if (m.needs_attention) return "Needs Attention";
  if (m.needs_ola_review) return "Needs OLA review";
  return "In Review";
}

// =========================================================
// TYPES
// =========================================================

export interface MilestoneCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  milestone_type: string;
  is_public?: boolean;
  description?: string | null;
  deadline?: string | null;
}

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
 * Create a new milestone for an action.
 * Assigns the next serial_number for this action (by deadline order).
 */
export async function createMilestone(
  input: MilestoneCreateInput,
): Promise<MilestoneResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in" };
    }

    // Get next serial_number for this action (max + 1, or 1 if none exist)
    const nextSerial = await query<{ next_serial: number }>(
      `SELECT COALESCE(MAX(serial_number), 0) + 1 AS next_serial
       FROM ${DB_SCHEMA}.action_milestones
       WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2)`,
      [input.action_id, input.action_sub_id ?? null],
    );
    const serial_number = nextSerial[0]?.next_serial ?? 1;

    const rows = await query<ActionMilestone>(
      `INSERT INTO ${DB_SCHEMA}.action_milestones 
       (action_id, action_sub_id, serial_number, milestone_type, is_public, description, deadline, status, submitted_by, submitted_by_entity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9)
       RETURNING *`,
      [
        input.action_id,
        input.action_sub_id || null,
        serial_number,
        input.milestone_type,
        input.is_public ?? false,
        input.description || null,
        input.deadline || null,
        user.id,
        user.entity,
      ],
    );

    // Create initial version history entry
    await query(
      `INSERT INTO ${DB_SCHEMA}.milestone_versions 
       (milestone_id, description, deadline, updates, status, changed_by, change_type)
       VALUES ($1, $2, $3, NULL, 'draft', $4, 'created')`,
      [rows[0].id, input.description || null, input.deadline || null, user.id],
    );

    return { success: true, milestone: rows[0] };
  } catch (e) {
    const msg = String((e as Error).message ?? "");
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { 
        success: false, 
        error: "A milestone of this type already exists for this action" 
      };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create milestone",
    };
  }
}

/**
 * Update milestone content (description, deadline, updates).
 * Does NOT change status - use submitMilestone for that.
 */
export async function updateMilestone(
  milestoneId: string,
  input: MilestoneUpdateInput,
): Promise<MilestoneResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in" };
    }

    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

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

    await query(
      `INSERT INTO ${DB_SCHEMA}.milestone_versions 
     (milestone_id, description, deadline, updates, status, changed_by, change_type)
     SELECT id, description, deadline, updates, status, $1, 'updated'
     FROM ${DB_SCHEMA}.action_milestones
     WHERE id = $2`,
      [user.id, milestoneId],
    );

    const updatesWithReview = [
      ...updates,
      `content_review_status = 'needs_review'`,
      `content_reviewed_by = NULL`,
      `content_reviewed_at = NULL`,
    ];

    try {
      await query(
        `UPDATE ${DB_SCHEMA}.action_milestones
       SET ${updatesWithReview.join(", ")}
       WHERE id = $${paramIndex}`,
        params,
      );
    } catch (e) {
      const msg = String((e as Error).message ?? "");
      if (msg.includes("content_review") || msg.includes("does not exist")) {
        await query(
          `UPDATE ${DB_SCHEMA}.action_milestones
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex}`,
          params,
        );
      } else {
        throw e;
      }
    }

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save milestone",
    };
  }
}

/**
 * Approve milestone content (admin only).
 * Sets content_review_status to approved after an edit.
 */
export async function approveMilestoneContent(
  milestoneId: string,
): Promise<MilestoneResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    if (adminCheck[0]?.user_role !== "Admin") {
      return { success: false, error: "Admin only" };
    }

    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await query(
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET content_review_status = 'approved',
         content_reviewed_by = $1,
         content_reviewed_at = NOW(),
         is_approved = TRUE,
         is_draft = FALSE,
         needs_attention = FALSE,
         needs_ola_review = FALSE,
         reviewed_by_ola = FALSE,
         finalized = FALSE,
         attention_to_timeline = FALSE,
         confirmation_needed = FALSE
     WHERE id = $2`,
      [user.id, milestoneId],
    );

    await insertActivityEntry({
      type: "milestone_status",
      action_id: milestone.action_id,
      action_sub_id: milestone.action_sub_id,
      milestone_id: milestoneId,
      title: "Milestone status changed",
      description: `${previousStatus} → Approved`,
      user_id: user.id,
    });

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to approve milestone content",
    };
  }
}

/**
 * Request changes to a milestone (reject approval).
 * Sets needs_attention flag to indicate milestone requires revision.
 */
export async function requestMilestoneChanges(
  milestoneId: string,
): Promise<MilestoneResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    if (adminCheck[0]?.user_role !== "Admin") {
      return { success: false, error: "Admin only" };
    }

    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await query(
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET needs_attention = TRUE,
         is_approved = FALSE,
         needs_ola_review = FALSE,
         reviewed_by_ola = FALSE,
         finalized = FALSE,
         attention_to_timeline = FALSE,
         confirmation_needed = FALSE,
         content_review_status = 'needs_review',
         content_reviewed_by = $1,
         content_reviewed_at = NOW()
     WHERE id = $2`,
      [user.id, milestoneId],
    );

    await insertActivityEntry({
      type: "milestone_status",
      action_id: milestone.action_id,
      action_sub_id: milestone.action_sub_id,
      milestone_id: milestoneId,
      title: "Milestone status changed",
      description: `${previousStatus} → Needs Attention`,
      user_id: user.id,
    });

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to request milestone changes",
    };
  }
}

/**
 * Set milestone to draft status.
 * Marks the milestone as draft and clears approval/needs attention flags.
 */
export async function setMilestoneToDraft(
  milestoneId: string,
): Promise<MilestoneResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    if (adminCheck[0]?.user_role !== "Admin") {
      return { success: false, error: "Admin only" };
    }

    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await query(
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET is_draft = TRUE,
         is_approved = FALSE,
         needs_attention = FALSE,
         needs_ola_review = FALSE,
         reviewed_by_ola = FALSE,
         finalized = FALSE,
         content_review_status = 'needs_review'
     WHERE id = $1`,
      [milestoneId],
    );

    await insertActivityEntry({
      type: "milestone_status",
      action_id: milestone.action_id,
      action_sub_id: milestone.action_sub_id,
      milestone_id: milestoneId,
      title: "Milestone status changed",
      description: `${previousStatus} → Draft`,
      user_id: user.id,
    });

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to set milestone to draft",
    };
  }
}

/**
 * Set milestone to "Needs OLA review" (Office of Legal Affairs).
 * Admin only. Clears approved/draft/needs_attention.
 */
export async function setMilestoneNeedsOlaReview(
  milestoneId: string,
): Promise<MilestoneResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    if (adminCheck[0]?.user_role !== "Admin") {
      return { success: false, error: "Admin only" };
    }

    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await query(
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET needs_ola_review = TRUE,
         is_draft = FALSE,
         is_approved = FALSE,
         needs_attention = FALSE,
         reviewed_by_ola = FALSE,
         finalized = FALSE,
         attention_to_timeline = FALSE,
         confirmation_needed = FALSE,
         content_review_status = 'needs_review'
     WHERE id = $1`,
      [milestoneId],
    );

    await insertActivityEntry({
      type: "milestone_status",
      action_id: milestone.action_id,
      action_sub_id: milestone.action_sub_id,
      milestone_id: milestoneId,
      title: "Milestone status changed",
      description: `${previousStatus} → Needs OLA review`,
      user_id: user.id,
    });

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to set Needs OLA review",
    };
  }
}

/**
 * Set milestone to "Reviewed by OLA" (Office of Legal Affairs).
 * Admin only. Clears other status flags.
 */
export async function setMilestoneReviewedByOla(
  milestoneId: string,
): Promise<MilestoneResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    if (adminCheck[0]?.user_role !== "Admin") {
      return { success: false, error: "Admin only" };
    }

    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await query(
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET reviewed_by_ola = TRUE,
         is_draft = FALSE,
         is_approved = FALSE,
         needs_attention = FALSE,
         needs_ola_review = FALSE,
         finalized = FALSE,
         content_review_status = 'approved'
     WHERE id = $1`,
      [milestoneId],
    );

    await insertActivityEntry({
      type: "milestone_status",
      action_id: milestone.action_id,
      action_sub_id: milestone.action_sub_id,
      milestone_id: milestoneId,
      title: "Milestone status changed",
      description: `${previousStatus} → Reviewed by OLA`,
      user_id: user.id,
    });

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to set Reviewed by OLA",
    };
  }
}

/**
 * Set milestone to "Finalized".
 * Admin only. Clears other status flags.
 */
export async function setMilestoneFinalized(
  milestoneId: string,
): Promise<MilestoneResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    if (adminCheck[0]?.user_role !== "Admin") {
      return { success: false, error: "Admin only" };
    }

    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await query(
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET finalized = TRUE,
         is_draft = FALSE,
         is_approved = FALSE,
         needs_attention = FALSE,
         needs_ola_review = FALSE,
         reviewed_by_ola = FALSE,
         attention_to_timeline = FALSE,
         confirmation_needed = FALSE,
         content_review_status = 'approved'
     WHERE id = $1`,
      [milestoneId],
    );

    await insertActivityEntry({
      type: "milestone_status",
      action_id: milestone.action_id,
      action_sub_id: milestone.action_sub_id,
      milestone_id: milestoneId,
      title: "Milestone status changed",
      description: `${previousStatus} → Finalized`,
      user_id: user.id,
    });

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to set Finalized",
    };
  }
}

/**
 * Set milestone to "Attention to timeline".
 * Admin only. Clears other status flags.
 */
export async function setMilestoneAttentionToTimeline(
  milestoneId: string,
): Promise<MilestoneResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    if (adminCheck[0]?.user_role !== "Admin") {
      return { success: false, error: "Admin only" };
    }

    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await query(
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET attention_to_timeline = TRUE,
         is_draft = FALSE,
         is_approved = FALSE,
         needs_attention = FALSE,
         needs_ola_review = FALSE,
         reviewed_by_ola = FALSE,
         finalized = FALSE,
         confirmation_needed = FALSE,
         content_review_status = 'approved'
     WHERE id = $1`,
      [milestoneId],
    );

    await insertActivityEntry({
      type: "milestone_status",
      action_id: milestone.action_id,
      action_sub_id: milestone.action_sub_id,
      milestone_id: milestoneId,
      title: "Milestone status changed",
      description: `${previousStatus} → Attention to timeline`,
      user_id: user.id,
    });

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to set Attention to timeline",
    };
  }
}

/**
 * Set milestone to "Confirmation needed".
 * Admin only. Clears other status flags.
 */
export async function setMilestoneConfirmationNeeded(
  milestoneId: string,
): Promise<MilestoneResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    if (adminCheck[0]?.user_role !== "Admin") {
      return { success: false, error: "Admin only" };
    }

    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await query(
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET confirmation_needed = TRUE,
         is_draft = FALSE,
         is_approved = FALSE,
         needs_attention = FALSE,
         needs_ola_review = FALSE,
         reviewed_by_ola = FALSE,
         finalized = FALSE,
         attention_to_timeline = FALSE,
         content_review_status = 'approved'
     WHERE id = $1`,
      [milestoneId],
    );

    await insertActivityEntry({
      type: "milestone_status",
      action_id: milestone.action_id,
      action_sub_id: milestone.action_sub_id,
      milestone_id: milestoneId,
      title: "Milestone status changed",
      description: `${previousStatus} → Confirmation needed`,
      user_id: user.id,
    });

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to set Confirmation needed",
    };
  }
}

/**
 * Submit a milestone for review.
 * Changes status from 'draft' to 'submitted' and records submission metadata.
 */
export async function submitMilestone(
  milestoneId: string,
): Promise<MilestoneResult> {
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    if (milestone.status !== "draft" && milestone.status !== "rejected") {
      return {
        success: false,
        error: "Milestone has already been submitted",
      };
    }

    await query(
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET status = 'submitted',
         submitted_by = NULL,
         submitted_by_entity = NULL,
         submitted_at = NOW()
     WHERE id = $1`,
      [milestoneId],
    );

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to submit milestone",
    };
  }
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
  try {
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
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to approve milestone",
    };
  }
}

/**
 * Reject a submitted milestone with feedback (admin only).
 */
export async function rejectMilestone(
  milestoneId: string,
  feedback?: string,
): Promise<MilestoneResult> {
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    if (milestone.status !== "submitted" && milestone.status !== "under_review") {
      return { success: false, error: "Milestone is not pending approval" };
    }

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
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to reject milestone",
    };
  }
}
