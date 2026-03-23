"use server";

import { query, queryWithUser } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionMilestone } from "@/types";
import { getMilestoneById } from "./queries";
import { getCurrentUser } from "@/features/auth/service";
import {
  requireAdmin,
  requireWriteAccess,
} from "@/features/auth/lib/permissions";
import { notifyActionStakeholders } from "@/features/notifications/commands";

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
  is_public?: boolean;
  is_final?: boolean;
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
  const auth = await requireWriteAccess(
    input.action_id,
    input.action_sub_id ?? "",
  );
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in" };
    }

    // action_sub_id is NOT NULL in DB; use '' when absent (e.g. internal milestones on actions without sub_id)
    const actionSubId = input.action_sub_id ?? "";

    const isPublic = input.is_public ?? false;
    const isFinal = input.is_final ?? false;

    // Get next serial_number for this action+track (max + 1, or 1 if none exist)
    // Serial is independent per (action_id, action_sub_id, is_public) track
    const nextSerial = await queryWithUser<{ next_serial: number }>(
      auth.user.email,
      `SELECT COALESCE(MAX(serial_number), 0) + 1 AS next_serial
       FROM ${DB_SCHEMA}.action_milestones
       WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2) AND is_public = $3`,
      [input.action_id, actionSubId, isPublic],
    );
    const serial_number = nextSerial[0]?.next_serial ?? 1;

    const rows = await queryWithUser<ActionMilestone>(
      auth.user.email,
      `INSERT INTO ${DB_SCHEMA}.action_milestones
       (action_id, action_sub_id, serial_number, is_public, is_final, public_progress, description, deadline, status, submitted_by, submitted_by_entity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10)
       RETURNING *`,
      [
        input.action_id,
        actionSubId,
        serial_number,
        isPublic,
        isFinal,
        isPublic ? "in_progress" : null,
        input.description || null,
        input.deadline || null,
        user.id,
        user.entity,
      ],
    );

    // Create initial version history entry
    await queryWithUser(
      auth.user.email,
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
        error:
          "A milestone with this serial number already exists for this action track",
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

    const auth = await requireWriteAccess(
      milestone.action_id,
      milestone.action_sub_id,
    );
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    // Public milestones lock after submission — only admin can edit
    if (
      milestone.is_public &&
      !auth.user.isAdmin &&
      !["draft", "rejected"].includes(milestone.status)
    ) {
      return {
        success: false,
        error:
          "Public milestones are locked after submission. An admin must approve or reject first.",
      };
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

    await queryWithUser(
      auth.user.email,
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
      await queryWithUser(
        auth.user.email,
        `UPDATE ${DB_SCHEMA}.action_milestones
       SET ${updatesWithReview.join(", ")}
       WHERE id = $${paramIndex}`,
        params,
      );
    } catch (e) {
      const msg = String((e as Error).message ?? "");
      if (msg.includes("content_review") || msg.includes("does not exist")) {
        await queryWithUser(
          auth.user.email,
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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await queryWithUser(
      auth.user.email,
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
      [auth.user.id, milestoneId],
    );

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_status_changed",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone status changed",
      body: `${previousStatus} → Approved`,
      actorEmail: auth.user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await queryWithUser(
      auth.user.email,
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
      [auth.user.id, milestoneId],
    );

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_status_changed",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone status changed",
      body: `${previousStatus} → Needs Attention`,
      actorEmail: auth.user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await queryWithUser(
      auth.user.email,
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

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_status_changed",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone status changed",
      body: `${previousStatus} → Draft`,
      actorEmail: auth.user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await queryWithUser(
      auth.user.email,
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

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_status_changed",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone status changed",
      body: `${previousStatus} → Needs OLA review`,
      actorEmail: auth.user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to set Needs OLA review",
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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await queryWithUser(
      auth.user.email,
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

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_status_changed",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone status changed",
      body: `${previousStatus} → Reviewed by OLA`,
      actorEmail: auth.user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to set Reviewed by OLA",
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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await queryWithUser(
      auth.user.email,
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

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_status_changed",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone status changed",
      body: `${previousStatus} → Finalized`,
      actorEmail: auth.user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await queryWithUser(
      auth.user.email,
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

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_status_changed",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone status changed",
      body: `${previousStatus} → Attention to timeline`,
      actorEmail: auth.user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to set Attention to timeline",
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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    const previousStatus = getMilestoneStatusLabel(milestone);

    await queryWithUser(
      auth.user.email,
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

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_status_changed",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone status changed",
      body: `${previousStatus} → Confirmation needed`,
      actorEmail: auth.user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to set Confirmation needed",
    };
  }
}

/**
 * Update milestone document submitted status.
 */
export async function updateMilestoneDocumentSubmitted(
  milestoneId: string,
  submitted: boolean,
): Promise<MilestoneResult> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    await queryWithUser(
      auth.user.email,
      `UPDATE ${DB_SCHEMA}.action_milestones
       SET milestone_document_submitted = $1
       WHERE id = $2`,
      [submitted, milestoneId],
    );

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error
          ? e.message
          : "Failed to update milestone document status",
    };
  }
}

export type PublicProgressValue = "completed" | "in_progress" | "delayed";

/**
 * Update public milestone progress (Completed / In progress / Delayed).
 * Admin only. Only applies to public milestones.
 */
export async function updateMilestonePublicProgress(
  milestoneId: string,
  publicProgress: PublicProgressValue,
): Promise<MilestoneResult> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }
    if (!milestone.is_public) {
      return {
        success: false,
        error: "Public progress applies only to public milestones",
      };
    }

    await queryWithUser(
      auth.user.email,
      `UPDATE ${DB_SCHEMA}.action_milestones
       SET public_progress = $1
       WHERE id = $2 AND is_public = true`,
      [publicProgress, milestoneId],
    );

    const updated = await getMilestoneById(milestoneId);
    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to update public progress",
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
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }
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

    await queryWithUser(
      user.email,
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET status = 'submitted',
         submitted_by = NULL,
         submitted_by_entity = NULL,
         submitted_at = NOW()
     WHERE id = $1`,
      [milestoneId],
    );

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_submitted",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone submitted",
      body: `${milestone.is_public ? "Public" : "Internal"} milestone #${milestone.serial_number} submitted for review`,
      actorEmail: user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

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
// DELETE
// =========================================================

/**
 * Permanently delete a milestone and all related data (admin only).
 */
export async function deleteMilestone(
  milestoneId: string,
): Promise<MilestoneResult> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    await queryWithUser(
      auth.user.email,
      `DELETE FROM ${DB_SCHEMA}.action_milestones WHERE id = $1`,
      [milestoneId],
    );

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete milestone",
    };
  }
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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    if (
      milestone.status !== "submitted" &&
      milestone.status !== "under_review"
    ) {
      return { success: false, error: "Milestone is not pending approval" };
    }

    await queryWithUser(
      auth.user.email,
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET status = 'approved',
         approved_by = NULL,
         approved_at = NOW()
     WHERE id = $1`,
      [milestoneId],
    );

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_approved",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone approved",
      body: `${milestone.is_public ? "Public" : "Internal"} milestone #${milestone.serial_number} has been approved`,
      actorEmail: auth.user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }
  try {
    const milestone = await getMilestoneById(milestoneId);
    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    if (
      milestone.status !== "submitted" &&
      milestone.status !== "under_review"
    ) {
      return { success: false, error: "Milestone is not pending approval" };
    }

    const updatedUpdates = feedback
      ? `${milestone.updates || ""}\n\n[Rejected]: ${feedback}`.trim()
      : milestone.updates;

    await queryWithUser(
      auth.user.email,
      `UPDATE ${DB_SCHEMA}.action_milestones
     SET status = 'rejected',
         updates = $1,
         reviewed_by = NULL,
         reviewed_at = NOW()
     WHERE id = $2`,
      [updatedUpdates, milestoneId],
    );

    const updated = await getMilestoneById(milestoneId);

    notifyActionStakeholders({
      type: "milestone_rejected",
      actionId: milestone.action_id,
      actionSubId: milestone.action_sub_id ?? "",
      title: "Milestone rejected",
      body: `${milestone.is_public ? "Public" : "Internal"} milestone #${milestone.serial_number} has been rejected${feedback ? `: ${feedback}` : ""}`,
      actorEmail: auth.user.email,
      referenceId: milestoneId,
      referenceType: "milestone",
    }).catch(() => {});

    return { success: true, milestone: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to reject milestone",
    };
  }
}
