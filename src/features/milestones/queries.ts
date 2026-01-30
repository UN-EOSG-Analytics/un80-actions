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

  const rows = await query<ActionMilestone>(
    `SELECT
      id,
      action_id,
      action_sub_id,
      milestone_type,
      description,
      deadline::text,
      updates,
      status,
      submitted_by,
      submitted_by_entity,
      submitted_at,
      reviewed_by,
      reviewed_at,
      approved_by,
      approved_at
    FROM ${DB_SCHEMA}.action_milestones
    ${whereClause}
    ORDER BY
      CASE milestone_type
        WHEN 'first' THEN 1
        WHEN 'second' THEN 2
        WHEN 'third' THEN 3
        WHEN 'upcoming' THEN 4
        WHEN 'final' THEN 5
      END,
      deadline ASC NULLS LAST`,
    params,
  );

  return rows;
}

/**
 * Fetch a single milestone by ID.
 */
export async function getMilestoneById(
  milestoneId: string,
): Promise<ActionMilestone | null> {
  const rows = await query<ActionMilestone>(
    `SELECT
      id,
      action_id,
      action_sub_id,
      milestone_type,
      description,
      deadline::text,
      updates,
      status,
      submitted_by,
      submitted_by_entity,
      submitted_at,
      reviewed_by,
      reviewed_at,
      approved_by,
      approved_at
    FROM ${DB_SCHEMA}.action_milestones
    WHERE id = $1`,
    [milestoneId],
  );

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
      id,
      milestone_id,
      description,
      deadline::text,
      updates,
      status,
      changed_by,
      changed_at,
      change_type
    FROM ${DB_SCHEMA}.milestone_versions
    WHERE milestone_id = $1
    ORDER BY changed_at DESC`,
    [milestoneId],
  );

  return rows;
}
