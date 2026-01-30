"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionQuestion } from "@/types";

// =========================================================
// QUERIES
// =========================================================

/**
 * Fetch all questions for a specific action.
 */
export async function getActionQuestions(
  actionId: number,
  subId?: string | null,
): Promise<ActionQuestion[]> {
  const whereClause =
    subId !== undefined
      ? "WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2)"
      : "WHERE action_id = $1";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  const rows = await query<ActionQuestion>(
    `SELECT
      id,
      action_id,
      action_sub_id,
      user_id,
      question,
      answer,
      answered_by,
      answered_at,
      created_at,
      updated_at
    FROM ${DB_SCHEMA}.action_questions
    ${whereClause}
    ORDER BY created_at DESC`,
    params,
  );

  return rows;
}

/**
 * Fetch unanswered questions for a specific action.
 */
export async function getUnansweredQuestions(
  actionId: number,
  subId?: string | null,
): Promise<ActionQuestion[]> {
  const whereClause =
    subId !== undefined
      ? "WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2) AND answer IS NULL"
      : "WHERE action_id = $1 AND answer IS NULL";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  const rows = await query<ActionQuestion>(
    `SELECT
      id,
      action_id,
      action_sub_id,
      user_id,
      question,
      answer,
      answered_by,
      answered_at,
      created_at,
      updated_at
    FROM ${DB_SCHEMA}.action_questions
    ${whereClause}
    ORDER BY created_at ASC`,
    params,
  );

  return rows;
}

/**
 * Fetch a single question by ID.
 */
export async function getQuestionById(
  questionId: string,
): Promise<ActionQuestion | null> {
  const rows = await query<ActionQuestion>(
    `SELECT
      id,
      action_id,
      action_sub_id,
      user_id,
      question,
      answer,
      answered_by,
      answered_at,
      created_at,
      updated_at
    FROM ${DB_SCHEMA}.action_questions
    WHERE id = $1`,
    [questionId],
  );

  return rows[0] || null;
}
