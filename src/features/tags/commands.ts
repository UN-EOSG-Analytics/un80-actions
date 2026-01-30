"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { getCurrentUser } from "@/features/auth/service";
import type { Tag } from "./queries";

export type TagEntityType = "milestone" | "note" | "question";

export interface TagResult {
  success: boolean;
  error?: string;
  tags?: Tag[];
}

async function ensureAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
    [user.email],
  );
  return adminCheck[0]?.user_role === "Admin";
}

/**
 * Get or create a tag by name. Reuses existing tag if same name exists.
 */
async function getOrCreateTag(tagName: string): Promise<string | null> {
  const trimmed = tagName.trim();
  if (!trimmed) return null;

  const existing = await query<{ id: string }>(
    `SELECT id FROM ${DB_SCHEMA}.tags WHERE name = $1`,
    [trimmed],
  );
  if (existing.length > 0) return existing[0].id;

  const inserted = await query<{ id: string }>(
    `INSERT INTO ${DB_SCHEMA}.tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [trimmed],
  );
  if (inserted.length > 0) return inserted[0].id;

  const retry = await query<{ id: string }>(
    `SELECT id FROM ${DB_SCHEMA}.tags WHERE name = $1`,
    [trimmed],
  );
  return retry[0]?.id ?? null;
}

/**
 * Add a tag to a milestone. Admin only.
 */
export async function addTagToMilestone(
  milestoneId: string,
  tagName: string,
): Promise<TagResult> {
  if (!(await ensureAdmin())) {
    return { success: false, error: "Admin only" };
  }
  const tagId = await getOrCreateTag(tagName);
  if (!tagId) return { success: false, error: "Invalid tag name" };

  try {
    await query(
      `INSERT INTO ${DB_SCHEMA}.milestone_tags (milestone_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (milestone_id, tag_id) DO NOTHING`,
      [milestoneId, tagId],
    );
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add tag",
    };
  }

  const { getTagsForMilestone } = await import("./queries");
  const tags = await getTagsForMilestone(milestoneId);
  return { success: true, tags };
}

/**
 * Add a tag to a note. Admin only.
 */
export async function addTagToNote(
  noteId: string,
  tagName: string,
): Promise<TagResult> {
  if (!(await ensureAdmin())) {
    return { success: false, error: "Admin only" };
  }
  const tagId = await getOrCreateTag(tagName);
  if (!tagId) return { success: false, error: "Invalid tag name" };

  try {
    await query(
      `INSERT INTO ${DB_SCHEMA}.note_tags (note_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (note_id, tag_id) DO NOTHING`,
      [noteId, tagId],
    );
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add tag",
    };
  }

  const { getTagsForNote } = await import("./queries");
  const tags = await getTagsForNote(noteId);
  return { success: true, tags };
}

/**
 * Add a tag to a question. Admin only.
 */
export async function addTagToQuestion(
  questionId: string,
  tagName: string,
): Promise<TagResult> {
  if (!(await ensureAdmin())) {
    return { success: false, error: "Admin only" };
  }
  const tagId = await getOrCreateTag(tagName);
  if (!tagId) return { success: false, error: "Invalid tag name" };

  try {
    await query(
      `INSERT INTO ${DB_SCHEMA}.question_tags (question_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (question_id, tag_id) DO NOTHING`,
      [questionId, tagId],
    );
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add tag",
    };
  }

  const { getTagsForQuestion } = await import("./queries");
  const tags = await getTagsForQuestion(questionId);
  return { success: true, tags };
}

/**
 * Remove a tag from a milestone. Admin only.
 */
export async function removeTagFromMilestone(
  milestoneId: string,
  tagId: string,
): Promise<TagResult> {
  try {
    if (!(await ensureAdmin())) {
      return { success: false, error: "Admin only" };
    }
    await query(
      `DELETE FROM ${DB_SCHEMA}.milestone_tags
     WHERE milestone_id = $1 AND tag_id = $2`,
      [milestoneId, tagId],
    );
    const { getTagsForMilestone } = await import("./queries");
    const tags = await getTagsForMilestone(milestoneId);
    return { success: true, tags };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to remove tag",
    };
  }
}

/**
 * Remove a tag from a note. Admin only.
 */
export async function removeTagFromNote(
  noteId: string,
  tagId: string,
): Promise<TagResult> {
  try {
    if (!(await ensureAdmin())) {
      return { success: false, error: "Admin only" };
    }
    await query(
      `DELETE FROM ${DB_SCHEMA}.note_tags
     WHERE note_id = $1 AND tag_id = $2`,
      [noteId, tagId],
    );
    const { getTagsForNote } = await import("./queries");
    const tags = await getTagsForNote(noteId);
    return { success: true, tags };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to remove tag",
    };
  }
}

/**
 * Remove a tag from a question. Admin only.
 */
export async function removeTagFromQuestion(
  questionId: string,
  tagId: string,
): Promise<TagResult> {
  try {
    if (!(await ensureAdmin())) {
      return { success: false, error: "Admin only" };
    }
    await query(
      `DELETE FROM ${DB_SCHEMA}.question_tags
     WHERE question_id = $1 AND tag_id = $2`,
      [questionId, tagId],
    );
    const { getTagsForQuestion } = await import("./queries");
    const tags = await getTagsForQuestion(questionId);
    return { success: true, tags };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to remove tag",
    };
  }
}
