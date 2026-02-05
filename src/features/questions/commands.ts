"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { getQuestionById } from "./queries";
import { requireAdmin } from "@/features/auth/lib/permissions";
import type { QuestionCreateInput, QuestionUpdateInput, QuestionResult } from "./types";

// =========================================================
// MUTATIONS
// =========================================================

/**
 * Create a new question for an action.
 * Admin-only: Only Admin/Legal users can create questions.
 */
export async function createQuestion(
  input: QuestionCreateInput,
): Promise<QuestionResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }
    const user = auth.user;

    if (!input.header || input.header.trim().length === 0) {
      return { success: false, error: "Header cannot be empty" };
    }
    if (!input.question_date) {
      return { success: false, error: "Date is required" };
    }
    if (!input.question || input.question.trim().length === 0) {
      return { success: false, error: "Question cannot be empty" };
    }

    const rows = await query<{ id: string }>(
      `INSERT INTO ${DB_SCHEMA}.action_questions 
     (action_id, action_sub_id, user_id, header, subtext, question_date, question, milestone_id, content_review_status, comment)
     VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, 'needs_review', $8)
     RETURNING id`,
      [
        input.action_id,
        input.action_sub_id ?? null,
        user.id,
        input.header.trim(),
        input.question_date,
        input.question.trim(),
        input.milestone_id ?? null,
        input.comment?.trim() || null,
      ],
    );

    const question = await getQuestionById(rows[0].id);
    return { success: true, question: question || undefined };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Failed to submit question",
    };
  }
}

/**
 * Update a question (before it's answered).
 * Admin-only: Only Admin/Legal users can edit questions.
 */
export async function updateQuestion(
  questionId: string,
  input: QuestionUpdateInput,
): Promise<QuestionResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const question = await getQuestionById(questionId);
    if (!question) {
      return { success: false, error: "Question not found" };
    }

    if (question.answer) {
      return {
        success: false,
        error: "Cannot edit a question that has been answered",
      };
    }

    if (!input.header || input.header.trim().length === 0) {
      return { success: false, error: "Header cannot be empty" };
    }
    if (!input.question_date) {
      return { success: false, error: "Date is required" };
    }
    if (!input.question || input.question.trim().length === 0) {
      return { success: false, error: "Question cannot be empty" };
    }

    await query(
      `UPDATE ${DB_SCHEMA}.action_questions
     SET header = $1, subtext = NULL, question_date = $2, question = $3, milestone_id = $4, updated_at = NOW(),
         content_review_status = 'needs_review',
         content_reviewed_by = NULL,
         content_reviewed_at = NULL
     WHERE id = $5`,
      [
        input.header.trim(),
        input.question_date,
        input.question.trim(),
        input.milestone_id ?? null,
        questionId,
      ],
    );

    const updated = await getQuestionById(questionId);
    return { success: true, question: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update question",
    };
  }
}

/**
 * Answer a question.
 * Admin-only: Only Admin/Legal users can answer questions.
 */
export async function answerQuestion(
  questionId: string,
  answer: string,
): Promise<QuestionResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }
    const user = auth.user;

    const question = await getQuestionById(questionId);
    if (!question) {
      return { success: false, error: "Question not found" };
    }

    if (!answer || answer.trim().length === 0) {
      return { success: false, error: "Answer cannot be empty" };
    }

    await query(
      `UPDATE ${DB_SCHEMA}.action_questions
     SET answer = $1, 
         answered_by = $2, 
         answered_at = NOW(),
         updated_at = NOW(),
         content_review_status = 'needs_review',
         content_reviewed_by = NULL,
         content_reviewed_at = NULL
     WHERE id = $3`,
      [answer.trim(), user.id, questionId],
    );

    const updated = await getQuestionById(questionId);
    return { success: true, question: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save answer",
    };
  }
}

/**
 * Update an existing answer.
 * Admin-only: Only Admin/Legal users can update answers.
 */
export async function updateAnswer(
  questionId: string,
  newAnswer: string,
): Promise<QuestionResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const question = await getQuestionById(questionId);
    if (!question) {
      return { success: false, error: "Question not found" };
    }

    if (!question.answer) {
      return { success: false, error: "Question has not been answered yet" };
    }

    if (!newAnswer || newAnswer.trim().length === 0) {
      return { success: false, error: "Answer cannot be empty" };
    }

    await query(
      `UPDATE ${DB_SCHEMA}.action_questions
     SET answer = $1, updated_at = NOW(),
         content_review_status = 'needs_review',
         content_reviewed_by = NULL,
         content_reviewed_at = NULL
     WHERE id = $2`,
      [newAnswer.trim(), questionId],
    );

    const updated = await getQuestionById(questionId);
    return { success: true, question: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update answer",
    };
  }
}

/**
 * Approve a question's content.
 * Admin-only: Only Admin/Legal users can approve questions.
 */
export async function approveQuestion(
  questionId: string,
): Promise<QuestionResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }
    const user = auth.user;

    const question = await getQuestionById(questionId);
    if (!question) {
      return { success: false, error: "Question not found" };
    }

    await query(
      `UPDATE ${DB_SCHEMA}.action_questions
     SET content_review_status = 'approved',
         content_reviewed_by = $1,
         content_reviewed_at = NOW()
     WHERE id = $2`,
      [user.id, questionId],
    );

    const updated = await getQuestionById(questionId);
    return { success: true, question: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to approve question",
    };
  }
}

/**
 * Update the internal comment on a question.
 * Admin-only. Comment can be null to clear.
 */
export async function updateQuestionComment(
  questionId: string,
  comment: string | null,
): Promise<QuestionResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const question = await getQuestionById(questionId);
    if (!question) {
      return { success: false, error: "Question not found" };
    }

    await query(
      `UPDATE ${DB_SCHEMA}.action_questions
     SET comment = $1, updated_at = NOW()
     WHERE id = $2`,
      [comment?.trim() || null, questionId],
    );

    const updated = await getQuestionById(questionId);
    return { success: true, question: updated || undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update comment",
    };
  }
}

/**
 * Delete a question.
 * Admin-only: Only Admin/Legal users can delete questions.
 */
export async function deleteQuestion(
  questionId: string,
): Promise<QuestionResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const question = await getQuestionById(questionId);
    if (!question) {
      return { success: false, error: "Question not found" };
    }

    await query(`DELETE FROM ${DB_SCHEMA}.action_questions WHERE id = $1`, [
      questionId,
    ]);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete question",
    };
  }
}
