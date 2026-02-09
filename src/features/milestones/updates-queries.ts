"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";

// =========================================================
// TYPES
// =========================================================

export interface MilestoneUpdate {
  id: string;
  milestone_id: string;
  user_id: string | null;
  user_email: string | null;
  content: string;
  reply_to: string | null;
  is_resolved: boolean;
  is_legal: boolean;
  created_at: Date;
  updated_at: Date | null;
  content_review_status: "approved" | "needs_review";
  content_reviewed_by: string | null;
  content_reviewed_by_email: string | null;
  content_reviewed_at: Date | null;
}

// =========================================================
// QUERIES
// =========================================================

/**
 * Fetch all updates for a specific milestone.
 */
export async function getMilestoneUpdates(
  milestoneId: string,
): Promise<MilestoneUpdate[]> {
  const rows = await query<MilestoneUpdate & { is_legal?: boolean }>(
    `SELECT
      u.id,
      u.milestone_id,
      u.user_id,
      us.email as user_email,
      u.content,
      u.reply_to,
      u.is_resolved,
      COALESCE(u.is_legal, false) as is_legal,
      u.created_at,
      u.updated_at,
      COALESCE(u.content_review_status, 'approved')::text as content_review_status,
      u.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      u.content_reviewed_at
    FROM ${DB_SCHEMA}.milestone_updates u
    LEFT JOIN ${DB_SCHEMA}.users us ON u.user_id = us.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON u.content_reviewed_by = ru.id
    WHERE u.milestone_id = $1
    ORDER BY u.is_legal ASC, u.created_at ASC`,
    [milestoneId],
  );

  return rows.map((r) => ({
    ...r,
    is_legal: Boolean(r.is_legal),
  }));
}

/**
 * Fetch updates for multiple milestones in a single query.
 * Returns a map of milestone_id -> array of updates.
 * Admin-only: returns empty object for non-admins.
 */
export async function getBatchMilestoneUpdates(
  milestoneIds: string[],
): Promise<Record<string, MilestoneUpdate[]>> {
  if (!(await checkIsAdmin()) || milestoneIds.length === 0) {
    return {};
  }

  const rows = await query<MilestoneUpdate & { is_legal?: boolean }>(
    `SELECT
      u.id,
      u.milestone_id,
      u.user_id,
      us.email as user_email,
      u.content,
      u.reply_to,
      u.is_resolved,
      COALESCE(u.is_legal, false) as is_legal,
      u.created_at,
      u.updated_at,
      COALESCE(u.content_review_status, 'approved')::text as content_review_status,
      u.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      u.content_reviewed_at
    FROM ${DB_SCHEMA}.milestone_updates u
    LEFT JOIN ${DB_SCHEMA}.users us ON u.user_id = us.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON u.content_reviewed_by = ru.id
    WHERE u.milestone_id = ANY($1)
    ORDER BY u.milestone_id, u.is_legal ASC, u.created_at ASC`,
    [milestoneIds],
  );

  // Group by milestone_id
  const result: Record<string, MilestoneUpdate[]> = {};
  for (const r of rows) {
    const update: MilestoneUpdate = { ...r, is_legal: Boolean(r.is_legal) };
    if (!result[r.milestone_id]) {
      result[r.milestone_id] = [];
    }
    result[r.milestone_id].push(update);
  }

  return result;
}

/**
 * Fetch a single milestone update by ID.
 */
export async function getMilestoneUpdateById(
  updateId: string,
): Promise<MilestoneUpdate | null> {
  const rows = await query<MilestoneUpdate & { is_legal?: boolean }>(
    `SELECT
      u.id,
      u.milestone_id,
      u.user_id,
      us.email as user_email,
      u.content,
      u.reply_to,
      u.is_resolved,
      COALESCE(u.is_legal, false) as is_legal,
      u.created_at,
      u.updated_at,
      COALESCE(u.content_review_status, 'approved')::text as content_review_status,
      u.content_reviewed_by,
      ru.email as content_reviewed_by_email,
      u.content_reviewed_at
    FROM ${DB_SCHEMA}.milestone_updates u
    LEFT JOIN ${DB_SCHEMA}.users us ON u.user_id = us.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON u.content_reviewed_by = ru.id
    WHERE u.id = $1`,
    [updateId],
  );

  const r = rows[0];
  if (!r) return null;
  return { ...r, is_legal: Boolean(r.is_legal) };
}
