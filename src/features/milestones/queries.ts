"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import type { ActionMilestone, MilestoneStatus } from "@/types";

// =========================================================
// TYPES
// =========================================================

export interface MilestoneVersion {
  id: string;
  milestone_id: string;
  description: string | null;
  deadline: string | null;
  updates: string | null;
  status: MilestoneStatus;
  changed_by: string | null;
  changed_at: Date;
  change_type: string;
}

// =========================================================
// QUERIES
// =========================================================

/**
 * Fetch all milestones for a specific action.
 */
export async function getActionMilestones(
  actionId: number,
  subId?: string | null,
): Promise<ActionMilestone[]> {
  const whereClause =
    subId !== undefined
      ? "WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2)"
      : "WHERE action_id = $1";

  const params = subId !== undefined ? [actionId, subId] : [actionId];

  let rows: (ActionMilestone & { content_reviewed_by_email?: string | null })[];
  try {
    rows = await query(
      `SELECT
        m.id,
        m.action_id,
        m.action_sub_id,
        m.serial_number,
        m.milestone_type,
        m.is_public,
        m.is_draft,
        m.is_approved,
        m.needs_attention,
        m.needs_ola_review,
        m.description,
        m.deadline::text,
        m.updates,
        m.status,
        COALESCE(m.content_review_status, 'approved')::text as content_review_status,
        m.content_reviewed_by,
        ru.email as content_reviewed_by_email,
        m.content_reviewed_at,
        m.submitted_by,
        m.submitted_by_entity,
        m.submitted_at,
        m.reviewed_by,
        m.reviewed_at,
        m.approved_by,
        m.approved_at
      FROM ${DB_SCHEMA}.action_milestones m
      LEFT JOIN ${DB_SCHEMA}.users ru ON m.content_reviewed_by = ru.id
      ${whereClause.replace("action_id", "m.action_id").replace("action_sub_id", "m.action_sub_id")}
      ORDER BY
        CASE m.milestone_type
          WHEN 'first' THEN 1
          WHEN 'second' THEN 2
          WHEN 'third' THEN 3
          WHEN 'upcoming' THEN 4
          WHEN 'final' THEN 5
        END,
        m.deadline ASC NULLS LAST`,
      params,
    );
  } catch (e) {
    const msg = String((e as Error).message ?? "");
    if (msg.includes("content_review") || msg.includes("does not exist")) {
      rows = await query(
        `SELECT
          m.id,
          m.action_id,
          m.action_sub_id,
          m.serial_number,
          m.milestone_type,
          m.is_public,
          m.is_draft,
          m.is_approved,
          m.needs_attention,
          m.description,
          m.deadline::text,
          m.updates,
          m.status,
          m.submitted_by,
          m.submitted_by_entity,
          m.submitted_at,
          m.reviewed_by,
          m.reviewed_at,
          m.approved_by,
          m.approved_at
        FROM ${DB_SCHEMA}.action_milestones m
        ${whereClause.replace("action_id", "m.action_id").replace("action_sub_id", "m.action_sub_id")}
        ORDER BY
          CASE m.milestone_type
            WHEN 'first' THEN 1
            WHEN 'second' THEN 2
            WHEN 'third' THEN 3
            WHEN 'upcoming' THEN 4
            WHEN 'final' THEN 5
          END,
          m.deadline ASC NULLS LAST`,
        params,
      );
      return rows.map((r) => ({
        ...r,
        needs_ola_review: (r as ActionMilestone).needs_ola_review ?? false,
        content_review_status: "approved" as const,
        content_reviewed_by: null,
        content_reviewed_by_email: null,
        content_reviewed_at: null,
      }));
    }
    throw e;
  }

  return rows;
}

/**
 * Fetch a single milestone by ID.
 */
export async function getMilestoneById(
  milestoneId: string,
): Promise<ActionMilestone | null> {
  let rows: (ActionMilestone & { content_reviewed_by_email?: string | null })[];
  try {
    rows = await query(
      `SELECT
        m.id,
        m.action_id,
        m.action_sub_id,
        m.serial_number,
        m.milestone_type,
        m.is_public,
        m.is_draft,
        m.is_approved,
        m.needs_attention,
        m.needs_ola_review,
        m.description,
        m.deadline::text,
        m.updates,
        m.status,
        COALESCE(m.content_review_status, 'approved')::text as content_review_status,
        m.content_reviewed_by,
        ru.email as content_reviewed_by_email,
        m.content_reviewed_at,
        m.submitted_by,
        m.submitted_by_entity,
        m.submitted_at,
        m.reviewed_by,
        m.reviewed_at,
        m.approved_by,
        m.approved_at
      FROM ${DB_SCHEMA}.action_milestones m
      LEFT JOIN ${DB_SCHEMA}.users ru ON m.content_reviewed_by = ru.id
      WHERE m.id = $1`,
      [milestoneId],
    );
  } catch (e) {
    const msg = String((e as Error).message ?? "");
    if (msg.includes("content_review") || msg.includes("does not exist")) {
      rows = await query(
        `SELECT
          m.id,
          m.action_id,
          m.action_sub_id,
          m.serial_number,
          m.milestone_type,
          m.is_public,
          m.is_draft,
          m.is_approved,
          m.needs_attention,
          m.description,
          m.deadline::text,
          m.updates,
          m.status,
          m.submitted_by,
          m.submitted_by_entity,
          m.submitted_at,
          m.reviewed_by,
          m.reviewed_at,
          m.approved_by,
          m.approved_at
        FROM ${DB_SCHEMA}.action_milestones m
        WHERE m.id = $1`,
        [milestoneId],
      );
      const r = rows[0];
      return r
        ? {
            ...r,
            needs_ola_review: (r as ActionMilestone).needs_ola_review ?? false,
            content_review_status: "approved" as const,
            content_reviewed_by: null,
            content_reviewed_by_email: null,
            content_reviewed_at: null,
          }
        : null;
    }
    throw e;
  }

  return rows[0] || null;
}

/**
 * Fetch version history for a milestone.
 */
export async function getMilestoneVersions(
  milestoneId: string,
): Promise<MilestoneVersion[]> {
  const rows = await query<MilestoneVersion>(
    `SELECT
      mv.id,
      mv.milestone_id,
      mv.description,
      mv.deadline::text,
      mv.updates,
      mv.status,
      u.email as changed_by,
      mv.changed_at,
      mv.change_type
    FROM ${DB_SCHEMA}.milestone_versions mv
    LEFT JOIN ${DB_SCHEMA}.users u ON mv.changed_by = u.id
    WHERE mv.milestone_id = $1
    ORDER BY mv.changed_at DESC`,
    [milestoneId],
  );

  return rows;
}
