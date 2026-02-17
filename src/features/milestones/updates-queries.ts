"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { getCurrentUser } from "@/features/auth/service";
import { requireAdmin } from "@/features/auth/lib/permissions";

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
  is_internal: boolean;
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
 * Any authenticated user can read team/legal updates; only admins see internal (admin-only) comments.
 */
export async function getMilestoneUpdates(
  milestoneId: string,
): Promise<MilestoneUpdate[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const adminAuth = await requireAdmin();
  const isAdmin = adminAuth.authorized;
  const hideInternal = !isAdmin;

  const rows = await query<MilestoneUpdate & { is_legal?: boolean; is_internal?: boolean }>(
    `SELECT
      u.id,
      u.milestone_id,
      u.user_id,
      us.email as user_email,
      u.content,
      u.reply_to,
      u.is_resolved,
      COALESCE(u.is_legal, false) as is_legal,
      COALESCE(u.is_internal, false) as is_internal,
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
    ${hideInternal ? "AND (COALESCE(u.is_internal, false) = false)" : ""}
    ORDER BY u.is_legal ASC, COALESCE(u.is_internal, false) ASC, u.created_at ASC`,
    [milestoneId],
  );

  return rows.map((r) => ({
    ...r,
    is_legal: Boolean(r.is_legal),
    is_internal: Boolean(r.is_internal),
  }));
}

/**
 * Fetch a single milestone update by ID.
 */
export async function getMilestoneUpdateById(
  updateId: string,
): Promise<MilestoneUpdate | null> {
  const rows = await query<MilestoneUpdate & { is_legal?: boolean; is_internal?: boolean }>(
    `SELECT
      u.id,
      u.milestone_id,
      u.user_id,
      us.email as user_email,
      u.content,
      u.reply_to,
      u.is_resolved,
      COALESCE(u.is_legal, false) as is_legal,
      COALESCE(u.is_internal, false) as is_internal,
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
  return { ...r, is_legal: Boolean(r.is_legal), is_internal: Boolean(r.is_internal) };
}
