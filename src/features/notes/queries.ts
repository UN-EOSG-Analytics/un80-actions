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
      ? "WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2)"
      : "WHERE action_id = $1";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  const rows = await query<ActionNote>(
    `SELECT
      id,
      action_id,
      action_sub_id,
      user_id,
      content,
      created_at,
      updated_at
    FROM ${DB_SCHEMA}.action_notes
    ${whereClause}
    ORDER BY created_at DESC`,
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
      id,
      action_id,
      action_sub_id,
      user_id,
      content,
      created_at,
      updated_at
    FROM ${DB_SCHEMA}.action_notes
    WHERE id = $1`,
    [noteId],
  );

  return rows[0] || null;
}
