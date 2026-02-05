"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { checkIsAdmin } from "@/features/auth/lib/permissions";
import type { ActionNote } from "@/types";

// =========================================================
// QUERIES
// =========================================================

/**
 * Fetch all notes for a specific action.
 * Admin-only: Returns empty array for non-admin users.
 */
export async function getActionNotes(
  actionId: number,
  subId?: string | null,
): Promise<ActionNote[]> {
  // Admin-only feature
  if (!(await checkIsAdmin())) {
    return [];
  }

  const whereClause =
    subId !== undefined
      ? "WHERE n.action_id = $1 AND (n.action_sub_id IS NOT DISTINCT FROM $2)"
      : "WHERE n.action_id = $1";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  const rows = await query<ActionNote>(
    `SELECT
      n.id,
      n.action_id,
      n.action_sub_id,
      n.user_id,
      u.email as user_email,
      n.header,
      n.note_date::text,
      n.content,
      n.created_at,
      n.updated_at,
      COALESCE(n.content_review_status, 'approved')::text as content_review_status,
      n.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      n.content_reviewed_at
    FROM ${DB_SCHEMA}.action_notes n
    LEFT JOIN ${DB_SCHEMA}.users u ON n.user_id = u.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON n.content_reviewed_by = ru.id
    ${whereClause}
    ORDER BY n.created_at DESC`,
    params,
  );

  return rows;
}

/**
 * Fetch a single note by ID.
 * Admin-only: Returns null for non-admin users.
 */
export async function getNoteById(noteId: string): Promise<ActionNote | null> {
  // Admin-only feature
  if (!(await checkIsAdmin())) {
    return null;
  }

  const rows = await query<ActionNote>(
    `SELECT
      n.id,
      n.action_id,
      n.action_sub_id,
      n.user_id,
      u.email as user_email,
      n.header,
      n.note_date::text,
      n.content,
      n.created_at,
      n.updated_at,
      COALESCE(n.content_review_status, 'approved')::text as content_review_status,
      n.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      n.content_reviewed_at
    FROM ${DB_SCHEMA}.action_notes n
    LEFT JOIN ${DB_SCHEMA}.users u ON n.user_id = u.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON n.content_reviewed_by = ru.id
    WHERE n.id = $1`,
    [noteId],
  );

  return rows[0] || null;
}
