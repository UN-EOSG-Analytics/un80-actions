"use server";

import { query } from "@/lib/db/db";
import { getCurrentUser } from "@/features/auth/service";
import { requireAdmin } from "@/features/auth/lib/permissions";
import { DB_SCHEMA } from "@/lib/db/config";
import type { MilestoneUpdate } from "./updates-queries";

// =========================================================
// TYPES
// =========================================================

export interface MilestoneUpdateCreateInput {
  milestone_id: string;
  content: string;
  reply_to?: string | null;
  /** When true, comment goes to Legal updates & comments; otherwise Team updates & comments */
  is_legal?: boolean;
  /** When true, comment is admin-only internal comment (internal milestones only; only admins can set) */
  is_internal?: boolean;
}

export interface MilestoneUpdateResult {
  success: boolean;
  error?: string;
  update?: MilestoneUpdate;
}

// =========================================================
// MUTATIONS
// =========================================================

/**
 * Create a new update for a milestone.
 * Any authenticated user can create (public and internal milestones).
 */
export async function createMilestoneUpdate(
  input: MilestoneUpdateCreateInput,
): Promise<MilestoneUpdateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const adminAuth = await requireAdmin();
  const isAdmin = adminAuth.authorized;
  const isLegal = input.is_legal ?? false;
  const isInternal = isAdmin ? (input.is_internal ?? false) : false;

  try {
    const rows = await query<MilestoneUpdate & { is_legal?: boolean; is_internal?: boolean }>(
      `INSERT INTO ${DB_SCHEMA}.milestone_updates (milestone_id, user_id, content, reply_to, is_legal, is_internal)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.milestone_id, user.id, input.content, input.reply_to || null, isLegal, isInternal],
    );

    const row = rows[0];
    return { success: true, update: row ? { ...row, is_legal: Boolean(row.is_legal), is_internal: Boolean(row.is_internal) } : undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create update",
    };
  }
}

/**
 * Toggle resolved status on a milestone update (admin only).
 */
export async function toggleMilestoneUpdateResolved(
  updateId: string,
): Promise<MilestoneUpdateResult> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    await query(
      `UPDATE ${DB_SCHEMA}.milestone_updates 
       SET is_resolved = NOT is_resolved 
       WHERE id = $1`,
      [updateId],
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle resolved status",
    };
  }
}

/**
 * Delete a milestone update. Allowed for the comment author or an admin.
 */
export async function deleteMilestoneUpdate(
  updateId: string,
): Promise<MilestoneUpdateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const adminAuth = await requireAdmin();
  const isAdmin = adminAuth.authorized;

  try {
    const checkRows = await query<{ user_id: string | null }>(
      `SELECT user_id FROM ${DB_SCHEMA}.milestone_updates WHERE id = $1`,
      [updateId],
    );

    if (!checkRows[0]) {
      return { success: false, error: "Update not found" };
    }

    const isAuthor = checkRows[0].user_id === user.id;
    if (!isAdmin && !isAuthor) {
      return { success: false, error: "You can only delete your own comments" };
    }

    await query(
      `DELETE FROM ${DB_SCHEMA}.milestone_updates WHERE id = $1`,
      [updateId],
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete update",
    };
  }
}

/**
 * Update a milestone update's content. Allowed for the comment author or an admin.
 */
export async function updateMilestoneUpdate(
  updateId: string,
  content: string,
): Promise<MilestoneUpdateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const adminAuth = await requireAdmin();
  const isAdmin = adminAuth.authorized;

  try {
    const checkRows = await query<{ user_id: string | null }>(
      `SELECT user_id FROM ${DB_SCHEMA}.milestone_updates WHERE id = $1`,
      [updateId],
    );

    if (!checkRows[0]) {
      return { success: false, error: "Update not found" };
    }

    const isAuthor = checkRows[0].user_id === user.id;
    if (!isAdmin && !isAuthor) {
      return { success: false, error: "You can only edit your own comments" };
    }

    const rows = await query<MilestoneUpdate & { is_legal?: boolean }>(
      `UPDATE ${DB_SCHEMA}.milestone_updates
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content.trim(), updateId],
    );

    const row = rows[0];
    return { success: true, update: row ? { ...row, is_legal: Boolean(row.is_legal) } : undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update comment",
    };
  }
}
