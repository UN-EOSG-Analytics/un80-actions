"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionQuestion } from "@/types";

// =========================================================
// QUERIES
// =========================================================

/**
 * Fetch all questions for a specific action.
 * Returns every question from every user so all users see the full history.
 */
export async function getActionQuestions(
  actionId: number,
  subId?: string | null,
): Promise<ActionQuestion[]> {
  const whereClause =
    subId !== undefined
      ? "WHERE q.action_id = $1 AND (q.action_sub_id IS NOT DISTINCT FROM $2)"
      : "WHERE q.action_id = $1";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  const rows = await query<ActionQuestion>(
    `SELECT
      q.id,
      q.action_id,
      q.action_sub_id,
      q.user_id,
      u.email as user_email,
      q.header,
      q.question_date::text,
      q.question,
      q.answer,
      q.answered_by,
      au.email as answered_by_email,
      q.answered_at,
      q.created_at,
      q.updated_at,
      COALESCE(q.content_review_status, 'approved')::text as content_review_status,
      q.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      q.content_reviewed_at
    FROM ${DB_SCHEMA}.action_questions q
    LEFT JOIN ${DB_SCHEMA}.users u ON q.user_id = u.id
    LEFT JOIN ${DB_SCHEMA}.users au ON q.answered_by = au.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON q.content_reviewed_by = ru.id
    ${whereClause}
    ORDER BY q.created_at DESC`,
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
      ? "WHERE q.action_id = $1 AND (q.action_sub_id IS NOT DISTINCT FROM $2) AND q.answer IS NULL"
      : "WHERE q.action_id = $1 AND q.answer IS NULL";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  const rows = await query<ActionQuestion>(
    `SELECT
      q.id,
      q.action_id,
      q.action_sub_id,
      q.user_id,
      u.email as user_email,
      q.header,
      q.question_date::text,
      q.question,
      q.answer,
      q.answered_by,
      au.email as answered_by_email,
      q.answered_at,
      q.created_at,
      q.updated_at,
      COALESCE(q.content_review_status, 'approved')::text as content_review_status,
      q.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      q.content_reviewed_at
    FROM ${DB_SCHEMA}.action_questions q
    LEFT JOIN ${DB_SCHEMA}.users u ON q.user_id = u.id
    LEFT JOIN ${DB_SCHEMA}.users au ON q.answered_by = au.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON q.content_reviewed_by = ru.id
    ${whereClause}
    ORDER BY q.created_at ASC`,
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
      q.id,
      q.action_id,
      q.action_sub_id,
      q.user_id,
      u.email as user_email,
      q.header,
      q.question_date::text,
      q.question,
      q.answer,
      q.answered_by,
      au.email as answered_by_email,
      q.answered_at,
      q.created_at,
      q.updated_at,
      COALESCE(q.content_review_status, 'approved')::text as content_review_status,
      q.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      q.content_reviewed_at
    FROM ${DB_SCHEMA}.action_questions q
    LEFT JOIN ${DB_SCHEMA}.users u ON q.user_id = u.id
    LEFT JOIN ${DB_SCHEMA}.users au ON q.answered_by = au.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON q.content_reviewed_by = ru.id
    WHERE q.id = $1`,
    [questionId],
  );

  return rows[0] || null;
}
