"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionNote } from "@/types";

// =========================================================
// QUERIES
// =========================================================

/**
 * Fetch all notes for a specific action.
 */
export async function getActionNotes(
  actionId: number,
  subId?: string | null,
): Promise<ActionNote[]> {
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
      n.content,
      n.created_at,
      n.updated_at
    FROM ${DB_SCHEMA}.action_notes n
    LEFT JOIN ${DB_SCHEMA}.users u ON n.user_id = u.id
    ${whereClause}
    ORDER BY n.created_at DESC`,
    params,
  );

  return rows;
}

/**
 * Fetch a single note by ID.
 */
export async function getNoteById(noteId: string): Promise<ActionNote | null> {
  const rows = await query<ActionNote>(
    `SELECT
      n.id,
      n.action_id,
      n.action_sub_id,
      n.user_id,
      u.email as user_email,
      n.content,
      n.created_at,
      n.updated_at
    FROM ${DB_SCHEMA}.action_notes n
    LEFT JOIN ${DB_SCHEMA}.users u ON n.user_id = u.id
    WHERE n.id = $1`,
    [noteId],
  );

  return rows[0] || null;
}
