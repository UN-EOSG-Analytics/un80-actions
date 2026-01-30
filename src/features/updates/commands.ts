"use server";

import { query } from "@/lib/db/db";
import { getCurrentUser } from "@/features/auth/service";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionUpdate } from "@/types";
import { getUpdateById } from "./queries";

// =========================================================
// TYPES
// =========================================================

export interface UpdateCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  content: string;
}

export interface UpdateUpdateInput {
  content: string;
}

export interface UpdateResult {
  success: boolean;
  error?: string;
  update?: ActionUpdate;
}

// =========================================================
// PERMISSION CHECKS
// =========================================================

/**
 * Check if user can create/view updates for a given action.
 * Any authenticated user assigned to the action can add updates.
 */
async function canAccessActionUpdates(
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

  // Check if user is associated with this action (focal point, support, or member)
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
      UNION ALL
      SELECT 1 FROM ${DB_SCHEMA}.action_member_persons
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
 * Create a new update for an action.
 */
export async function createUpdate(
  input: UpdateCreateInput,
): Promise<UpdateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user can add updates to this action
  const canAccess = await canAccessActionUpdates(
    user.email,
    input.action_id,
    input.action_sub_id ?? null,
  );
  if (!canAccess) {
    return {
      success: false,
      error: "Not authorized to add updates to this action",
    };
  }

  // Validate content
  if (!input.content || input.content.trim().length === 0) {
    return { success: false, error: "Update content cannot be empty" };
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO ${DB_SCHEMA}.action_updates 
     (action_id, action_sub_id, user_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      input.action_id,
      input.action_sub_id ?? null,
      user.id,
      input.content.trim(),
    ],
  );

  const update = await getUpdateById(rows[0].id);
  return { success: true, update: update || undefined };
}

/**
 * Update an existing action update.
 * Only the update author can edit their updates.
 */
export async function updateUpdate(
  updateId: string,
  input: UpdateUpdateInput,
): Promise<UpdateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the update
  const update = await getUpdateById(updateId);
  if (!update) {
    return { success: false, error: "Update not found" };
  }

  // Check if user is the author or admin
  const isAuthor = update.user_id === user.id;
  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE email = $1`,
    [user.email],
  );
  const isAdmin = adminCheck[0]?.user_role === "Admin";

  if (!isAuthor && !isAdmin) {
    return { success: false, error: "Not authorized to edit this update" };
  }

  // Validate content
  if (!input.content || input.content.trim().length === 0) {
    return { success: false, error: "Update content cannot be empty" };
  }

  await query(
    `UPDATE ${DB_SCHEMA}.action_updates
     SET content = $1, updated_at = NOW()
     WHERE id = $2`,
    [input.content.trim(), updateId],
  );

  const updated = await getUpdateById(updateId);
  return { success: true, update: updated || undefined };
}

/**
 * Delete an update.
 * Only the update author or admin can delete.
 */
export async function deleteUpdate(updateId: string): Promise<UpdateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const update = await getUpdateById(updateId);
  if (!update) {
    return { success: false, error: "Update not found" };
  }

  // Check if user is the author or admin
  const isAuthor = update.user_id === user.id;
  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE email = $1`,
    [user.email],
  );
  const isAdmin = adminCheck[0]?.user_role === "Admin";

  if (!isAuthor && !isAdmin) {
    return { success: false, error: "Not authorized to delete this update" };
  }

  await query(`DELETE FROM ${DB_SCHEMA}.action_updates WHERE id = $1`, [
    updateId,
  ]);

  return { success: true };
}
