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
  const rows = await query<MilestoneUpdate>(
    `SELECT
      u.id,
      u.milestone_id,
      u.user_id,
      us.email as user_email,
      u.content,
      u.reply_to,
      u.is_resolved,
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
    ORDER BY u.created_at ASC`,
    [milestoneId],
  );

  return rows;
}

/**
 * Fetch a single milestone update by ID.
 */
export async function getMilestoneUpdateById(
  updateId: string,
): Promise<MilestoneUpdate | null> {
  const rows = await query<MilestoneUpdate>(
    `SELECT
      u.id,
      u.milestone_id,
      u.user_id,
      us.email as user_email,
      u.content,
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

  return rows[0] || null;
}
