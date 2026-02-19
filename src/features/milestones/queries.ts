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
        m.reviewed_by_ola,
        m.finalized,
        m.attention_to_timeline,
        m.confirmation_needed,
        m.milestone_document_submitted,
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
        m.approved_at,
        m.public_progress
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
    if (msg.includes("content_review") || msg.includes("does not exist") || msg.includes("milestone_document_submitted") || msg.includes("attention_to_timeline") || msg.includes("confirmation_needed") || msg.includes("public_progress")) {
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
        reviewed_by_ola: (r as ActionMilestone).reviewed_by_ola ?? false,
        finalized: (r as ActionMilestone).finalized ?? false,
        attention_to_timeline: (r as ActionMilestone).attention_to_timeline ?? false,
        confirmation_needed: (r as ActionMilestone).confirmation_needed ?? false,
        milestone_document_submitted: (r as ActionMilestone).milestone_document_submitted ?? false,
        content_review_status: "approved" as const,
        content_reviewed_by: null,
        content_reviewed_by_email: null,
        content_reviewed_at: null,
        public_progress: (r as ActionMilestone).public_progress ?? null,
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
        m.reviewed_by_ola,
        m.finalized,
        m.attention_to_timeline,
        m.confirmation_needed,
        m.milestone_document_submitted,
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
        m.approved_at,
        m.public_progress
      FROM ${DB_SCHEMA}.action_milestones m
      LEFT JOIN ${DB_SCHEMA}.users ru ON m.content_reviewed_by = ru.id
      WHERE m.id = $1`,
      [milestoneId],
    );
  } catch (e) {
    const msg = String((e as Error).message ?? "");
    if (msg.includes("content_review") || msg.includes("does not exist") || msg.includes("milestone_document_submitted") || msg.includes("attention_to_timeline") || msg.includes("confirmation_needed") || msg.includes("public_progress")) {
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
            reviewed_by_ola: (r as ActionMilestone).reviewed_by_ola ?? false,
            finalized: (r as ActionMilestone).finalized ?? false,
            content_review_status: "approved" as const,
            content_reviewed_by: null,
            content_reviewed_by_email: null,
            content_reviewed_at: null,
            public_progress: (r as ActionMilestone).public_progress ?? null,
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

// =========================================================
// MILESTONE VIEW TABLE
// =========================================================

export interface MilestoneViewCell {
  description: string | null;
  deadline: string | null;
  is_draft?: boolean;
  needs_attention?: boolean;
  needs_ola_review?: boolean;
  /** Internal milestone: marked complete */
  finalized?: boolean;
  /** Internal milestone: needs attention to timeline */
  attention_to_timeline?: boolean;
}

export interface MilestoneViewRow {
  work_package_id: number;
  work_package_title: string;
  action_id: number;
  action_sub_id: string | null;
  public_milestone: MilestoneViewCell | null;
  first_milestone: MilestoneViewCell | null;
  final_milestone: MilestoneViewCell | null;
  document_submitted: boolean;
}

type MilestoneViewRowDb = {
  work_package_id: number;
  work_package_title: string;
  action_id: number;
  action_sub_id: string | null;
  public_description: string | null;
  public_deadline: string | null;
  public_is_draft: boolean | null;
  public_needs_attention: boolean | null;
  public_needs_ola_review: boolean | null;
  first_description: string | null;
  first_deadline: string | null;
  first_is_draft: boolean | null;
  first_needs_attention: boolean | null;
  first_needs_ola_review: boolean | null;
  first_finalized: boolean | null;
  first_attention_to_timeline: boolean | null;
  final_description: string | null;
  final_deadline: string | null;
  final_is_draft: boolean | null;
  final_needs_attention: boolean | null;
  final_needs_ola_review: boolean | null;
  final_finalized: boolean | null;
  final_attention_to_timeline: boolean | null;
  document_submitted: boolean;
};

/**
 * Fetch table data for the Milestone View page: one row per action with WP,
 * action number, and public / first / final milestone (description + deadline).
 */
export async function getMilestoneViewTableData(): Promise<MilestoneViewRow[]> {
  const q = `
    SELECT
      wp.id AS work_package_id,
      wp.work_package_title,
      a.id AS action_id,
      a.sub_id AS action_sub_id,
      (SELECT m.description FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.is_public = true
       ORDER BY m.deadline ASC NULLS LAST
       LIMIT 1) AS public_description,
      (SELECT m.deadline::text FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.is_public = true
       ORDER BY m.deadline ASC NULLS LAST
       LIMIT 1) AS public_deadline,
      (SELECT m.is_draft FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.is_public = true
       ORDER BY m.deadline ASC NULLS LAST
       LIMIT 1) AS public_is_draft,
      (SELECT m.needs_attention FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.is_public = true
       ORDER BY m.deadline ASC NULLS LAST
       LIMIT 1) AS public_needs_attention,
      (SELECT m.needs_ola_review FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.is_public = true
       ORDER BY m.deadline ASC NULLS LAST
       LIMIT 1) AS public_needs_ola_review,
      (SELECT m.description FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'first'
       LIMIT 1) AS first_description,
      (SELECT m.deadline::text FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'first'
       LIMIT 1) AS first_deadline,
      (SELECT m.is_draft FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'first'
       LIMIT 1) AS first_is_draft,
      (SELECT m.needs_attention FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'first'
       LIMIT 1) AS first_needs_attention,
      (SELECT m.needs_ola_review FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'first'
       LIMIT 1) AS first_needs_ola_review,
      (SELECT m.finalized FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'first'
       LIMIT 1) AS first_finalized,
      (SELECT m.attention_to_timeline FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'first'
       LIMIT 1) AS first_attention_to_timeline,
      (SELECT m.description FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'final'
       LIMIT 1) AS final_description,
      (SELECT m.deadline::text FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'final'
       LIMIT 1) AS final_deadline,
      (SELECT m.is_draft FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'final'
       LIMIT 1) AS final_is_draft,
      (SELECT m.needs_attention FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'final'
       LIMIT 1) AS final_needs_attention,
      (SELECT m.needs_ola_review FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'final'
       LIMIT 1) AS final_needs_ola_review,
      (SELECT m.finalized FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'final'
       LIMIT 1) AS final_finalized,
      (SELECT m.attention_to_timeline FROM ${DB_SCHEMA}.action_milestones m
       WHERE m.action_id = a.id AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND m.milestone_type = 'final'
       LIMIT 1) AS final_attention_to_timeline,
      COALESCE(a.document_submitted, false) AS document_submitted
    FROM work_packages wp
    JOIN actions a ON a.work_package_id = wp.id
    ORDER BY wp.id, a.id, a.sub_id ASC NULLS FIRST
  `;
  const rows = await query<MilestoneViewRowDb>(q);
  const toCell = (
    desc: string | null,
    deadline: string | null,
    isDraft: boolean | null,
    needsAttention: boolean | null,
    needsOlaReview: boolean | null,
    finalized?: boolean | null,
    attentionToTimeline?: boolean | null,
  ): MilestoneViewCell | null => {
    const fin = finalized ?? false;
    const att = attentionToTimeline ?? false;
    if (
      desc == null &&
      deadline == null &&
      !isDraft &&
      !needsAttention &&
      !needsOlaReview &&
      !fin &&
      !att
    ) {
      return null;
    }
    return {
      description: desc ?? null,
      deadline: deadline ?? null,
      is_draft: isDraft ?? false,
      needs_attention: needsAttention ?? false,
      needs_ola_review: needsOlaReview ?? false,
      finalized: fin,
      attention_to_timeline: att,
    };
  };
  return rows.map((r) => ({
    work_package_id: r.work_package_id,
    work_package_title: r.work_package_title,
    action_id: r.action_id,
    action_sub_id: r.action_sub_id,
    public_milestone: toCell(
      r.public_description,
      r.public_deadline,
      r.public_is_draft,
      r.public_needs_attention,
      r.public_needs_ola_review,
    ),
    first_milestone: toCell(
      r.first_description,
      r.first_deadline,
      r.first_is_draft,
      r.first_needs_attention,
      r.first_needs_ola_review,
      r.first_finalized,
      r.first_attention_to_timeline,
    ),
    final_milestone: toCell(
      r.final_description,
      r.final_deadline,
      r.final_is_draft,
      r.final_needs_attention,
      r.final_needs_ola_review,
      r.final_finalized,
      r.final_attention_to_timeline,
    ),
    document_submitted: r.document_submitted,
  }));
}

// =========================================================
// PUBLIC MILESTONES VIEW
// =========================================================

export interface PublicMilestoneViewRow {
  work_package_id: number;
  work_package_title: string;
  action_id: number;
  action_sub_id: string | null;
  milestone_description: string | null;
  milestone_deadline: string | null;
  public_progress: "in_progress" | "delayed" | "completed" | null;
}

/**
 * Fetch all public milestones for the Public Milestone view: one row per public milestone
 * with WP, action, description and deadline.
 */
export async function getPublicMilestonesViewData(): Promise<PublicMilestoneViewRow[]> {
  const q = `
    SELECT
      wp.id AS work_package_id,
      wp.work_package_title,
      a.id AS action_id,
      a.sub_id AS action_sub_id,
      m.description AS milestone_description,
      m.deadline::text AS milestone_deadline,
      m.public_progress
    FROM ${DB_SCHEMA}.action_milestones m
    JOIN actions a ON a.id = m.action_id AND (a.sub_id IS NOT DISTINCT FROM m.action_sub_id)
    JOIN work_packages wp ON wp.id = a.work_package_id
    WHERE m.is_public = true
    ORDER BY wp.id, a.id, a.sub_id ASC NULLS FIRST, m.deadline ASC NULLS LAST
  `;
  const rows = await query<PublicMilestoneViewRow>(q);
  return rows;
}
