"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionNote } from "@/types";
import { getNoteById } from "./queries";
import { getCurrentUser } from "@/features/auth/service";

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
// MUTATIONS
// =========================================================

/**
 * Create a new note for an action.
 */
export async function createNote(input: NoteCreateInput): Promise<NoteResult> {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in to add notes" };
    }

    // Validate content
    if (!input.content || input.content.trim().length === 0) {
      return { success: false, error: "Note content cannot be empty" };
    }

    const rows = await query<{ id: string }>(
      `INSERT INTO ${DB_SCHEMA}.action_notes 
     (action_id, action_sub_id, user_id, content, content_review_status)
     VALUES ($1, $2, $3, $4, 'needs_review')
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
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add note",
    };
  }
}

/**
 * Update an existing note.
 * Only the note author can edit their notes.
 */
export async function updateNote(
  noteId: string,
  input: NoteUpdateInput,
): Promise<NoteResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const note = await getNoteById(noteId);
    if (!note) {
      return { success: false, error: "Note not found" };
    }

    const isAuthor = note.user_id === user.id;
    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    const isAdmin = adminCheck[0]?.user_role === "Admin";

    if (!isAuthor && !isAdmin) {
      return { success: false, error: "Not authorized to edit this note" };
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
 * Approve a note's content (admin/reviewer only).
 */
export async function approveNote(noteId: string): Promise<NoteResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    if (adminCheck[0]?.user_role !== "Admin") {
      return { success: false, error: "Admin only" };
    }

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
 * Only the note author or admin can delete.
 */
export async function deleteNote(noteId: string): Promise<NoteResult> {
  try {
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
