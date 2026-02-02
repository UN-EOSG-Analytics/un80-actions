"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionLegalComment } from "@/types";

// =========================================================
// QUERIES
// =========================================================

/**
 * Fetch all legal comments for a specific action.
 * Returns every comment from every user so all users see the full history.
 */
export async function getActionLegalComments(
  actionId: number,
  subId?: string | null,
): Promise<ActionLegalComment[]> {
  const whereClause =
    subId !== undefined
      ? "WHERE c.action_id = $1 AND (c.action_sub_id IS NOT DISTINCT FROM $2)"
      : "WHERE c.action_id = $1";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  const rows = await query<ActionLegalComment>(
    `SELECT
      c.id,
      c.action_id,
      c.action_sub_id,
      c.user_id,
      u.email as user_email,
      c.content,
      c.created_at,
      c.updated_at,
      COALESCE(c.content_review_status, 'approved')::text as content_review_status,
      c.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      c.content_reviewed_at
    FROM ${DB_SCHEMA}.action_legal_comments c
    LEFT JOIN ${DB_SCHEMA}.users u ON c.user_id = u.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON c.content_reviewed_by = ru.id
    ${whereClause}
    ORDER BY c.created_at DESC`,
    params,
  );

  return rows;
}

/**
 * Fetch a single legal comment by ID.
 */
export async function getLegalCommentById(
  commentId: string,
): Promise<ActionLegalComment | null> {
  const rows = await query<ActionLegalComment>(
    `SELECT
      c.id,
      c.action_id,
      c.action_sub_id,
      c.user_id,
      u.email as user_email,
      c.content,
      c.created_at,
      c.updated_at,
      COALESCE(c.content_review_status, 'approved')::text as content_review_status,
      c.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      c.content_reviewed_at
    FROM ${DB_SCHEMA}.action_legal_comments c
    LEFT JOIN ${DB_SCHEMA}.users u ON c.user_id = u.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON c.content_reviewed_by = ru.id
    WHERE c.id = $1`,
    [commentId],
  );

  return rows[0] || null;
}
