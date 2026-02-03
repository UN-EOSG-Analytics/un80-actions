"use server";

import { query } from "@/lib/db/db";
import { getCurrentUser } from "@/features/auth/service";
import { DB_SCHEMA } from "@/lib/db/config";
import type { MilestoneUpdate } from "./updates-queries";

// =========================================================
// TYPES
// =========================================================

export interface MilestoneUpdateCreateInput {
  milestone_id: string;
  content: string;
  reply_to?: string | null;
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
 */
export async function createMilestoneUpdate(
  input: MilestoneUpdateCreateInput,
): Promise<MilestoneUpdateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const rows = await query<MilestoneUpdate>(
      `INSERT INTO ${DB_SCHEMA}.milestone_updates (milestone_id, user_id, content, reply_to)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.milestone_id, user.id, input.content, input.reply_to || null],
    );

    return { success: true, update: rows[0] };
  } catch (err) {
    console.error("Failed to create milestone update:", err);
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
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (user.user_role !== "Admin") {
    return { success: false, error: "Only admins can resolve comments" };
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
    console.error("Failed to toggle resolved status:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle resolved status",
    };
  }
}

/**
 * Delete a milestone update (only by creator or admin).
 */
export async function deleteMilestoneUpdate(
  updateId: string,
): Promise<MilestoneUpdateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Check if user owns the update or is admin
    const checkRows = await query<{ user_id: string }>(
      `SELECT user_id FROM ${DB_SCHEMA}.milestone_updates WHERE id = $1`,
      [updateId],
    );

    if (!checkRows[0]) {
      return { success: false, error: "Update not found" };
    }

    const isAdmin = user.user_role === "Admin";
    const isOwner = checkRows[0].user_id === user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, error: "Not authorized to delete this update" };
    }

    await query(
      `DELETE FROM ${DB_SCHEMA}.milestone_updates WHERE id = $1`,
      [updateId],
    );

    return { success: true };
  } catch (err) {
    console.error("Failed to delete milestone update:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete update",
    };
  }
}
