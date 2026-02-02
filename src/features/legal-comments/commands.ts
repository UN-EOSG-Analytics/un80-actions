"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionLegalComment } from "@/types";
import { getLegalCommentById } from "./queries";
import { getCurrentUser } from "@/features/auth/service";

// =========================================================
// TYPES
// =========================================================

export interface LegalCommentCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  content: string;
}

export interface LegalCommentResult {
  success: boolean;
  error?: string;
  comment?: ActionLegalComment;
}

// =========================================================
// MUTATIONS
// =========================================================

/**
 * Create a new legal comment for an action.
 */
export async function createLegalComment(
  input: LegalCommentCreateInput,
): Promise<LegalCommentResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in to add legal comments" };
    }

    if (!input.content || input.content.trim().length === 0) {
      return { success: false, error: "Comment content cannot be empty" };
    }

    const rows = await query<{ id: string }>(
      `INSERT INTO ${DB_SCHEMA}.action_legal_comments 
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

    const comment = await getLegalCommentById(rows[0].id);
    return { success: true, comment: comment || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add legal comment",
    };
  }
}

/**
 * Approve a legal comment (admin/reviewer only). Once approved, show with strikethrough.
 */
export async function approveLegalComment(
  commentId: string,
): Promise<LegalCommentResult> {
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

    const comment = await getLegalCommentById(commentId);
    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    await query(
      `UPDATE ${DB_SCHEMA}.action_legal_comments
     SET content_review_status = 'approved',
         content_reviewed_by = $1,
         content_reviewed_at = NOW()
     WHERE id = $2`,
      [user.id, commentId],
    );

    const updated = await getLegalCommentById(commentId);
    return { success: true, comment: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to approve comment",
    };
  }
}

/**
 * Delete a legal comment. Author or admin only.
 */
export async function deleteLegalComment(
  commentId: string,
): Promise<LegalCommentResult> {
  try {
    const comment = await getLegalCommentById(commentId);
    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    await query(`DELETE FROM ${DB_SCHEMA}.action_legal_comments WHERE id = $1`, [
      commentId,
    ]);

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete comment",
    };
  }
}
