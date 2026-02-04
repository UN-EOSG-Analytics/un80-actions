"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { getCurrentUser } from "@/features/auth/service";

export interface InsertActivityEntryInput {
  type: string;
  action_id: number;
  action_sub_id?: string | null;
  milestone_id?: string | null;
  title: string;
  description: string;
  user_id: string;
}

/**
 * Insert an activity feed entry (e.g. milestone status change).
 */
export async function insertActivityEntry(
  input: InsertActivityEntryInput,
): Promise<{ success: boolean; id?: string }> {
  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO ${DB_SCHEMA}.activity_entries
       (type, action_id, action_sub_id, milestone_id, title, description, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.type,
        input.action_id,
        input.action_sub_id ?? null,
        input.milestone_id ?? null,
        input.title,
        input.description,
        input.user_id,
      ],
    );
    return { success: true, id: rows[0]?.id };
  } catch (e) {
    return { success: false };
  }
}

/**
 * Mark an activity item as read/processed by the current user.
 */
export async function markActivityRead(
  activityId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    await query(
      `INSERT INTO ${DB_SCHEMA}.activity_read (activity_id, user_id, read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (activity_id, user_id) DO UPDATE SET read_at = NOW()`,
      [activityId, user.id],
    );
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to mark as read",
    };
  }
}

/**
 * Mark an activity item as unread by the current user.
 */
export async function markActivityUnread(
  activityId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    await query(
      `DELETE FROM ${DB_SCHEMA}.activity_read
       WHERE activity_id = $1 AND user_id = $2`,
      [activityId, user.id],
    );
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to mark as unread",
    };
  }
}
