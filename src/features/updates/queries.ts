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
      ? "WHERE u.action_id = $1 AND (u.action_sub_id IS NOT DISTINCT FROM $2)"
      : "WHERE u.action_id = $1";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  const rows = await query<ActionUpdate>(
    `SELECT
      u.id,
      u.action_id,
      u.action_sub_id,
      u.user_id,
      us.email as user_email,
      u.content,
      u.created_at,
      u.updated_at,
      COALESCE(u.content_review_status, 'approved')::text as content_review_status,
      u.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      u.content_reviewed_at
    FROM ${DB_SCHEMA}.action_updates u
    LEFT JOIN ${DB_SCHEMA}.users us ON u.user_id = us.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON u.content_reviewed_by = ru.id
    ${whereClause}
    ORDER BY u.created_at DESC`,
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
      u.id,
      u.action_id,
      u.action_sub_id,
      u.user_id,
      us.email as user_email,
      u.content,
      u.created_at,
      u.updated_at,
      COALESCE(u.content_review_status, 'approved')::text as content_review_status,
      u.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      u.content_reviewed_at
    FROM ${DB_SCHEMA}.action_updates u
    LEFT JOIN ${DB_SCHEMA}.users us ON u.user_id = us.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON u.content_reviewed_by = ru.id
    WHERE u.id = $1`,
    [updateId],
  );

  return rows[0] || null;
}
