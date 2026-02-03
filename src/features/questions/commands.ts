"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { getQuestionById } from "./queries";
import { getCurrentUser } from "@/features/auth/service";
import type { QuestionCreateInput, QuestionResult } from "./types";

// =========================================================
// MUTATIONS
// =========================================================

/**
 * Create a new question for an action.
 * Any authenticated user can ask questions.
 */
export async function createQuestion(
  input: QuestionCreateInput,
): Promise<QuestionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in to ask questions" };
    }

    if (!input.question || input.question.trim().length === 0) {
      return { success: false, error: "Question cannot be empty" };
    }

    const rows = await query<{ id: string }>(
      `INSERT INTO ${DB_SCHEMA}.action_questions 
     (action_id, action_sub_id, user_id, question, content_review_status)
     VALUES ($1, $2, $3, $4, 'needs_review')
     RETURNING id`,
      [
        input.action_id,
        input.action_sub_id ?? null,
        user.id,
        input.question.trim(),
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
 * Any authenticated user can edit.
 */
export async function updateQuestion(
  questionId: string,
  newQuestion: string,
): Promise<QuestionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in" };
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

    if (!newQuestion || newQuestion.trim().length === 0) {
      return { success: false, error: "Question cannot be empty" };
    }

    await query(
      `UPDATE ${DB_SCHEMA}.action_questions
     SET question = $1, updated_at = NOW(),
         content_review_status = 'needs_review',
         content_reviewed_by = NULL,
         content_reviewed_at = NULL
     WHERE id = $2`,
      [newQuestion.trim(), questionId],
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
 * Any authenticated user can answer.
 */
export async function answerQuestion(
  questionId: string,
  answer: string,
): Promise<QuestionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in" };
    }

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
 * Any authenticated user can update.
 */
export async function updateAnswer(
  questionId: string,
  newAnswer: string,
): Promise<QuestionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in" };
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
 * Approve a question's content (admin/reviewer only).
 */
export async function approveQuestion(
  questionId: string,
): Promise<QuestionResult> {
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
 * Delete a question.
 * Only the question author (if unanswered) or admin can delete.
 */
export async function deleteQuestion(
  questionId: string,
): Promise<QuestionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const question = await getQuestionById(questionId);
    if (!question) {
      return { success: false, error: "Question not found" };
    }

    const isAuthor = question.user_id === user.id;
    const adminCheck = await query<{ user_role: string }>(
      `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
      [user.email],
    );
    const isAdmin = adminCheck[0]?.user_role === "Admin";

    if (isAuthor && !question.answer) {
      await query(`DELETE FROM ${DB_SCHEMA}.action_questions WHERE id = $1`, [
        questionId,
      ]);
      return { success: true };
    }

    if (isAdmin) {
      await query(`DELETE FROM ${DB_SCHEMA}.action_questions WHERE id = $1`, [
        questionId,
      ]);
      return { success: true };
    }

    return { success: false, error: "Not authorized to delete this question" };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete question",
    };
  }
}
