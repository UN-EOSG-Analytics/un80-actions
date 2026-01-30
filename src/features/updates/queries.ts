"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionUpdate } from "@/types";

// =========================================================
// QUERIES
// =========================================================

/**
 * Fetch all updates for a specific action.
 */
export async function getActionUpdates(
  actionId: number,
  subId?: string | null,
): Promise<ActionUpdate[]> {
  const whereClause =
    subId !== undefined
      ? "WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2)"
      : "WHERE action_id = $1";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  const rows = await query<ActionUpdate>(
    `SELECT
      id,
      action_id,
      action_sub_id,
      user_id,
      content,
      created_at,
      updated_at
    FROM ${DB_SCHEMA}.action_updates
    ${whereClause}
    ORDER BY created_at DESC`,
    params,
  );

  return rows;
}

/**
 * Fetch a single update by ID.
 */
export async function getUpdateById(
  updateId: string,
): Promise<ActionUpdate | null> {
  const rows = await query<ActionUpdate>(
    `SELECT
      id,
      action_id,
      action_sub_id,
      user_id,
      content,
      created_at,
      updated_at
    FROM ${DB_SCHEMA}.action_updates
    WHERE id = $1`,
    [updateId],
  );

  return rows[0] || null;
}
