"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";

export interface ActivityItem {
  id: string;
  type: "note" | "question" | "milestone" | "tag" | "milestone_update";
  action_id: number;
  action_sub_id: string | null;
  title: string;
  description: string;
  user_email: string | null;
  timestamp: Date;
  change_type?: "created" | "updated" | "tagged";
}

/**
 * Fetch recent activity across the platform
 * Returns changes from notes, questions, milestones, tags, and milestone updates
 * Each section is wrapped in try/catch so one failing query (e.g. missing column) doesn't empty the feed.
 */
export async function getRecentActivity(limit: number = 50): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];
  const perSourceLimit = Math.min(limit, 20);

  // Recent notes (created or updated) – include all notes so seed/pipeline notes show too
  try {
    const notes = await query<{
      id: string;
      action_id: number;
      action_sub_id: string | null;
      user_email: string | null;
      created_at: Date;
      updated_at: Date | null;
      header: string | null;
    }>(
      `SELECT 
        n.id,
        n.action_id,
        n.action_sub_id,
        u.email as user_email,
        n.created_at,
        n.updated_at,
        n.header
      FROM ${DB_SCHEMA}.action_notes n
      LEFT JOIN ${DB_SCHEMA}.users u ON n.user_id = u.id
      ORDER BY GREATEST(n.created_at, COALESCE(n.updated_at, n.created_at)) DESC
      LIMIT $1`,
      [perSourceLimit],
    );

    for (const note of notes) {
      const isUpdated = note.updated_at && note.updated_at > note.created_at;
      activities.push({
        id: `note-${note.id}`,
        type: "note",
        action_id: note.action_id,
        action_sub_id: note.action_sub_id,
        title: note.header || "Note",
        description: isUpdated ? "Note updated" : "Note added",
        user_email: note.user_email,
        timestamp: isUpdated ? note.updated_at! : note.created_at,
        change_type: isUpdated ? "updated" : "created",
      });
    }
  } catch (e) {
    console.error("[Activity] Notes query failed:", e);
  }

  // Recent questions (created or updated)
  try {
  const questions = await query<{
    id: string;
    action_id: number;
    action_sub_id: string | null;
    user_email: string | null;
    created_at: Date;
    updated_at: Date | null;
    header: string | null;
  }>(
    `SELECT 
      q.id,
      q.action_id,
      q.action_sub_id,
      u.email as user_email,
      q.created_at,
      q.updated_at,
      q.header
    FROM ${DB_SCHEMA}.action_questions q
    LEFT JOIN ${DB_SCHEMA}.users u ON q.user_id = u.id
    ORDER BY GREATEST(q.created_at, COALESCE(q.updated_at, q.created_at)) DESC
    LIMIT $1`,
    [perSourceLimit],
  );

  for (const question of questions) {
    const isUpdated = question.updated_at && question.updated_at > question.created_at;
    activities.push({
      id: `question-${question.id}`,
      type: "question",
      action_id: question.action_id,
      action_sub_id: question.action_sub_id,
      title: question.header || "Question",
      description: isUpdated ? "Question updated" : "Question added",
      user_email: question.user_email,
      timestamp: isUpdated ? question.updated_at! : question.created_at,
      change_type: isUpdated ? "updated" : "created",
    });
  }
  } catch (e) {
    console.error("[Activity] Questions query failed:", e);
  }

  // Recent milestone changes (submitted, reviewed, approved)
  try {
  const milestones = await query<{
    id: string;
    action_id: number;
    action_sub_id: string | null;
    milestone_type: string;
    submitted_by_email: string | null;
    reviewed_by_email: string | null;
    approved_by_email: string | null;
    submitted_at: Date | null;
    reviewed_at: Date | null;
    approved_at: Date | null;
  }>(
    `SELECT 
      m.id,
      m.action_id,
      m.action_sub_id,
      m.milestone_type,
      su.email as submitted_by_email,
      ru.email as reviewed_by_email,
      au.email as approved_by_email,
      m.submitted_at,
      m.reviewed_at,
      m.approved_at
    FROM ${DB_SCHEMA}.action_milestones m
    LEFT JOIN ${DB_SCHEMA}.users su ON m.submitted_by = su.id
    LEFT JOIN ${DB_SCHEMA}.users ru ON m.reviewed_by = ru.id
    LEFT JOIN ${DB_SCHEMA}.users au ON m.approved_by = au.id
    WHERE m.submitted_at IS NOT NULL OR m.reviewed_at IS NOT NULL OR m.approved_at IS NOT NULL
    ORDER BY GREATEST(
      COALESCE(m.submitted_at, '1970-01-01'::timestamp),
      COALESCE(m.reviewed_at, '1970-01-01'::timestamp),
      COALESCE(m.approved_at, '1970-01-01'::timestamp)
    ) DESC
    LIMIT $1`,
    [perSourceLimit],
  );

  for (const milestone of milestones) {
    const timestamps = [
      { time: milestone.approved_at, type: "approved", email: milestone.approved_by_email },
      { time: milestone.reviewed_at, type: "reviewed", email: milestone.reviewed_by_email },
      { time: milestone.submitted_at, type: "submitted", email: milestone.submitted_by_email },
    ].filter((t) => t.time !== null);

    if (timestamps.length > 0) {
      const latest = timestamps.reduce((prev, curr) =>
        curr.time! > prev.time! ? curr : prev,
      );
      activities.push({
        id: `milestone-${milestone.id}-${latest.type}`,
        type: "milestone",
        action_id: milestone.action_id,
        action_sub_id: milestone.action_sub_id,
        title: `${milestone.milestone_type} milestone`,
        description: `Milestone ${latest.type}`,
        user_email: latest.email,
        timestamp: latest.time!,
        change_type: latest.type === "submitted" ? "created" : "updated",
      });
    }
  }
  } catch (e) {
    console.error("[Activity] Milestones query failed:", e);
  }

  // Recent milestone updates
  try {
  const milestoneUpdates = await query<{
    id: string;
    milestone_id: string;
    action_id: number;
    action_sub_id: string | null;
    user_email: string | null;
    created_at: Date;
    updated_at: Date | null;
  }>(
    `SELECT 
      mu.id,
      mu.milestone_id,
      m.action_id,
      m.action_sub_id,
      u.email as user_email,
      mu.created_at,
      mu.updated_at
    FROM ${DB_SCHEMA}.milestone_updates mu
    JOIN ${DB_SCHEMA}.action_milestones m ON mu.milestone_id = m.id
    LEFT JOIN ${DB_SCHEMA}.users u ON mu.user_id = u.id
    ORDER BY GREATEST(mu.created_at, COALESCE(mu.updated_at, mu.created_at)) DESC
    LIMIT $1`,
    [perSourceLimit],
  );

  for (const update of milestoneUpdates) {
    const isUpdated = update.updated_at && update.updated_at > update.created_at;
    activities.push({
      id: `milestone-update-${update.id}`,
      type: "milestone_update",
      action_id: update.action_id,
      action_sub_id: update.action_sub_id,
      title: "Milestone update",
      description: isUpdated ? "Milestone update modified" : "Milestone update added",
      user_email: update.user_email,
      timestamp: isUpdated ? update.updated_at! : update.created_at,
      change_type: isUpdated ? "updated" : "created",
    });
  }
  } catch (e) {
    console.error("[Activity] Milestone updates query failed:", e);
  }

  // Recent tags (when tags are created)
  try {
  const tags = await query<{
    id: string;
    name: string;
    created_at: Date;
  }>(
    `SELECT id, name, created_at
    FROM ${DB_SCHEMA}.tags
    ORDER BY created_at DESC
    LIMIT $1`,
    [perSourceLimit],
  );

  for (const tag of tags) {
    activities.push({
      id: `tag-${tag.id}`,
      type: "tag",
      action_id: 0, // Tags aren't action-specific
      action_sub_id: null,
      title: tag.name,
      description: "Tag created",
      user_email: null,
      timestamp: tag.created_at,
      change_type: "created",
    });
  }
  } catch (e) {
    console.error("[Activity] Tags query failed:", e);
  }

  // Sort all activities by timestamp (most recent first) and limit
  const toTime = (t: Date | string) =>
    t instanceof Date ? t.getTime() : new Date(t).getTime();
  return activities
    .sort((a, b) => toTime(b.timestamp) - toTime(a.timestamp))
    .slice(0, limit);
}
