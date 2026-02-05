"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { getNoteById } from "./queries";
import { requireAdmin } from "@/features/auth/lib/permissions";
import type { NoteCreateInput, NoteUpdateInput, NoteResult } from "./types";

// =========================================================
// MUTATIONS
// =========================================================

/**
 * Create a new note for an action.
 * Admin-only: Only Admin/Legal users can create notes.
 */
export async function createNote(input: NoteCreateInput): Promise<NoteResult> {
  try {
    // Check admin access
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }
    const user = auth.user;

    // Validate input
    if (!input.header || input.header.trim().length === 0) {
      return { success: false, error: "Header cannot be empty" };
    }
    if (!input.note_date) {
      return { success: false, error: "Date is required" };
    }
    if (!input.content || input.content.trim().length === 0) {
      return { success: false, error: "Note content cannot be empty" };
    }

    const rows = await query<{ id: string }>(
      `INSERT INTO ${DB_SCHEMA}.action_notes 
     (action_id, action_sub_id, user_id, header, note_date, content, content_review_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'needs_review')
     RETURNING id`,
      [
        input.action_id,
        input.action_sub_id ?? null,
        user.id,
        input.header.trim(),
        input.note_date,
        input.content.trim(),
      ],
    );

    const note = await getNoteById(rows[0].id);
    return { success: true, note: note || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add note",
    };
  }
}

/**
 * Update an existing note.
 * Admin-only: Only Admin/Legal users can edit notes.
 */
export async function updateNote(
  noteId: string,
  input: NoteUpdateInput,
): Promise<NoteResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const note = await getNoteById(noteId);
    if (!note) {
      return { success: false, error: "Note not found" };
    }

    if (!input.content || input.content.trim().length === 0) {
      return { success: false, error: "Note content cannot be empty" };
    }

    await query(
      `UPDATE ${DB_SCHEMA}.action_notes
     SET content = $1, updated_at = NOW(),
         content_review_status = 'needs_review',
         content_reviewed_by = NULL,
         content_reviewed_at = NULL
     WHERE id = $2`,
      [input.content.trim(), noteId],
    );

    const updated = await getNoteById(noteId);
    return { success: true, note: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update note",
    };
  }
}

/**
 * Approve a note's content.
 * Admin-only: Only Admin/Legal users can approve notes.
 */
export async function approveNote(noteId: string): Promise<NoteResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }
    const user = auth.user;

    const note = await getNoteById(noteId);
    if (!note) {
      return { success: false, error: "Note not found" };
    }

    await query(
      `UPDATE ${DB_SCHEMA}.action_notes
     SET content_review_status = 'approved',
         content_reviewed_by = $1,
         content_reviewed_at = NOW()
     WHERE id = $2`,
      [user.id, noteId],
    );

    const updated = await getNoteById(noteId);
    return { success: true, note: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to approve note",
    };
  }
}

/**
 * Delete a note.
 * Admin-only: Only Admin/Legal users can delete notes.
 */
export async function deleteNote(noteId: string): Promise<NoteResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const note = await getNoteById(noteId);
    if (!note) {
      return { success: false, error: "Note not found" };
    }

    await query(`DELETE FROM ${DB_SCHEMA}.action_notes WHERE id = $1`, [
      noteId,
    ]);

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete note",
    };
  }
}
