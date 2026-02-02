"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";

export interface Tag {
  id: string;
  name: string;
}

/**
 * Fetch all tags in the system (for dropdown reuse).
 */
export async function getAllTags(): Promise<Tag[]> {
  try {
    const rows = await query<Tag>(
      `SELECT id, name FROM ${DB_SCHEMA}.tags ORDER BY name ASC`,
      [],
    );
    return rows;
  } catch {
    return [];
  }
}

/**
 * Fetch tags for a milestone.
 */
export async function getTagsForMilestone(
  milestoneId: string,
): Promise<Tag[]> {
  try {
    const rows = await query<Tag>(
      `SELECT t.id, t.name
       FROM ${DB_SCHEMA}.tags t
       JOIN ${DB_SCHEMA}.milestone_tags mt ON t.id = mt.tag_id
       WHERE mt.milestone_id = $1
       ORDER BY t.name ASC`,
      [milestoneId],
    );
    return rows;
  } catch {
    return [];
  }
}

/**
 * Fetch tags for a note.
 */
export async function getTagsForNote(noteId: string): Promise<Tag[]> {
  try {
    const rows = await query<Tag>(
      `SELECT t.id, t.name
       FROM ${DB_SCHEMA}.tags t
       JOIN ${DB_SCHEMA}.note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = $1
       ORDER BY t.name ASC`,
      [noteId],
    );
    return rows;
  } catch {
    return [];
  }
}

/**
 * Fetch tags for a question.
 */
export async function getTagsForQuestion(
  questionId: string,
): Promise<Tag[]> {
  try {
    const rows = await query<Tag>(
      `SELECT t.id, t.name
       FROM ${DB_SCHEMA}.tags t
       JOIN ${DB_SCHEMA}.question_tags qt ON t.id = qt.tag_id
       WHERE qt.question_id = $1
       ORDER BY t.name ASC`,
      [questionId],
    );
    return rows;
  } catch {
    return [];
  }
}

/**
 * Fetch tags for a legal comment.
 */
export async function getTagsForLegalComment(
  legalCommentId: string,
): Promise<Tag[]> {
  try {
    const rows = await query<Tag>(
      `SELECT t.id, t.name
       FROM ${DB_SCHEMA}.tags t
       JOIN ${DB_SCHEMA}.legal_comment_tags lct ON t.id = lct.tag_id
       WHERE lct.legal_comment_id = $1
       ORDER BY t.name ASC`,
      [legalCommentId],
    );
    return rows;
  } catch {
    return [];
  }
}
