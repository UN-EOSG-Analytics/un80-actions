"use server";

import { query } from "@/lib/db/db";
import { getCurrentUser } from "@/features/auth/service";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionNote } from "@/types";
import { getNoteById } from "./queries";

// =========================================================
// TYPES
// =========================================================

export interface NoteCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  content: string;
}

export interface NoteUpdateInput {
  content: string;
}

export interface NoteResult {
  success: boolean;
  error?: string;
  note?: ActionNote;
}

// =========================================================
// PERMISSION CHECKS
// =========================================================

/**
 * Check if user can create/view notes for a given action.
 * Any authenticated user assigned to the action can add notes.
 */
async function canAccessActionNotes(
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
 * Create a new note for an action.
 */
export async function createNote(input: NoteCreateInput): Promise<NoteResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user can add notes to this action
  const canAccess = await canAccessActionNotes(
    user.email,
    input.action_id,
    input.action_sub_id ?? null,
  );
  if (!canAccess) {
    return {
      success: false,
      error: "Not authorized to add notes to this action",
    };
  }

  // Validate content
  if (!input.content || input.content.trim().length === 0) {
    return { success: false, error: "Note content cannot be empty" };
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO ${DB_SCHEMA}.action_notes 
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

  const note = await getNoteById(rows[0].id);
  return { success: true, note: note || undefined };
}

/**
 * Update an existing note.
 * Only the note author can edit their notes.
 */
export async function updateNote(
  noteId: string,
  input: NoteUpdateInput,
): Promise<NoteResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the note
  const note = await getNoteById(noteId);
  if (!note) {
    return { success: false, error: "Note not found" };
  }

  // Check if user is the author or admin
  const isAuthor = note.user_id === user.id;
  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE email = $1`,
    [user.email],
  );
  const isAdmin = adminCheck[0]?.user_role === "Admin";

  if (!isAuthor && !isAdmin) {
    return { success: false, error: "Not authorized to edit this note" };
  }

  // Validate content
  if (!input.content || input.content.trim().length === 0) {
    return { success: false, error: "Note content cannot be empty" };
  }

  await query(
    `UPDATE ${DB_SCHEMA}.action_notes
     SET content = $1, updated_at = NOW()
     WHERE id = $2`,
    [input.content.trim(), noteId],
  );

  const updated = await getNoteById(noteId);
  return { success: true, note: updated || undefined };
}

/**
 * Delete a note.
 * Only the note author or admin can delete.
 */
export async function deleteNote(noteId: string): Promise<NoteResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const note = await getNoteById(noteId);
  if (!note) {
    return { success: false, error: "Note not found" };
  }

  // Check if user is the author or admin
  const isAuthor = note.user_id === user.id;
  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE email = $1`,
    [user.email],
  );
  const isAdmin = adminCheck[0]?.user_role === "Admin";

  if (!isAuthor && !isAdmin) {
    return { success: false, error: "Not authorized to delete this note" };
  }

  await query(`DELETE FROM ${DB_SCHEMA}.action_notes WHERE id = $1`, [noteId]);

  return { success: true };
}
