"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionQuestion } from "@/types";
import { getQuestionById } from "./queries";

// =========================================================
// TYPES
// =========================================================

export interface QuestionCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  question: string;
}

export interface QuestionResult {
  success: boolean;
  error?: string;
  question?: ActionQuestion;
}

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
  // Validate question
  if (!input.question || input.question.trim().length === 0) {
    return { success: false, error: "Question cannot be empty" };
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO ${DB_SCHEMA}.action_questions 
     (action_id, action_sub_id, user_id, question)
     VALUES ($1, $2, NULL, $4)
     RETURNING id`,
    [input.action_id, input.action_sub_id ?? null, input.question.trim()],
  );

  const question = await getQuestionById(rows[0].id);
  return { success: true, question: question || undefined };
}

/**
 * Update a question (before it's answered).
 * Only the question author can edit.
 */
export async function updateQuestion(
  questionId: string,
  newQuestion: string,
): Promise<QuestionResult> {
  const question = await getQuestionById(questionId);
  if (!question) {
    return { success: false, error: "Question not found" };
  }

  // Only author can edit
  if (question.user_id !== user.id) {
    return { success: false, error: "Not authorized to edit this question" };
  }

  // Cannot edit after it's been answered
  if (question.answer) {
    return {
      success: false,
      error: "Cannot edit a question that has been answered",
    };
  }

  // Validate
  if (!newQuestion || newQuestion.trim().length === 0) {
    return { success: false, error: "Question cannot be empty" };
  }

  await query(
    `UPDATE ${DB_SCHEMA}.action_questions
     SET question = $1, updated_at = NOW()
     WHERE id = $2`,
    [newQuestion.trim(), questionId],
  );

  const updated = await getQuestionById(questionId);
  return { success: true, question: updated || undefined };
}

/**
 * Answer a question.
 * Only focal points, support persons, or admins can answer.
 */
export async function answerQuestion(
  questionId: string,
  answer: string,
): Promise<QuestionResult> {
  const question = await getQuestionById(questionId);
  if (!question) {
    return { success: false, error: "Question not found" };
  }

  // Validate answer
  if (!answer || answer.trim().length === 0) {
    return { success: false, error: "Answer cannot be empty" };
  }

  await query(
    `UPDATE ${DB_SCHEMA}.action_questions
     SET answer = $1, 
         answered_by = NULL, 
         answered_at = NOW(),
         updated_at = NOW()
     WHERE id = $2`,
    [answer.trim(), questionId],
  );

  const updated = await getQuestionById(questionId);
  return { success: true, question: updated || undefined };
}

/**
 * Update an existing answer.
 * Only the original answerer or admin can update.
 */
export async function updateAnswer(
  questionId: string,
  newAnswer: string,
): Promise<QuestionResult> {
  const question = await getQuestionById(questionId);
  if (!question) {
    return { success: false, error: "Question not found" };
  }

  if (!question.answer) {
    return { success: false, error: "Question has not been answered yet" };
  }

  // Validate answer
  if (!newAnswer || newAnswer.trim().length === 0) {
    return { success: false, error: "Answer cannot be empty" };
  }

  await query(
    `UPDATE ${DB_SCHEMA}.action_questions
     SET answer = $1, updated_at = NOW()
     WHERE id = $2`,
    [newAnswer.trim(), questionId],
  );

  const updated = await getQuestionById(questionId);
  return { success: true, question: updated || undefined };
}

/**
 * Delete a question.
 * Only the question author (if unanswered) or admin can delete.
 */
export async function deleteQuestion(
  questionId: string,
): Promise<QuestionResult> {
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
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE email = $1`,
    [user.email],
  );
  const isAdmin = adminCheck[0]?.user_role === "Admin";

  // Authors can only delete unanswered questions
  if (isAuthor && !question.answer) {
    await query(`DELETE FROM ${DB_SCHEMA}.action_questions WHERE id = $1`, [
      questionId,
    ]);
    return { success: true };
  }

  // Admins can delete any question
  if (isAdmin) {
    await query(`DELETE FROM ${DB_SCHEMA}.action_questions WHERE id = $1`, [
      questionId,
    ]);
    return { success: true };
  }

  return { success: false, error: "Not authorized to delete this question" };
}
