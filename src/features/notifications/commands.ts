"use server";

import { query, queryWithUser } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { getCurrentUser } from "@/features/auth/service";
import type {
  NotificationType,
  NotificationReferenceType,
} from "@/types";

// =========================================================
// NOTIFICATION FAN-OUT
// =========================================================

interface NotifyInput {
  type: NotificationType;
  actionId: number;
  actionSubId: string;
  title: string;
  body: string;
  actorEmail: string;
  referenceId?: string;
  referenceType?: NotificationReferenceType;
}

/**
 * Fan out a notification to all stakeholders of an action (ranks 0–4),
 * excluding the actor who triggered the event.
 *
 * This is a server-only helper — not exposed as a client action.
 */
export async function notifyActionStakeholders(
  input: NotifyInput,
): Promise<void> {
  const { actionId, actionSubId, actorEmail } = input;

  // Collect all user_ids who should receive this notification.
  // Uses plain query() since assignment tables don't have RLS.
  const recipients = await query<{ id: string }>(
    `SELECT DISTINCT u.id
     FROM ${DB_SCHEMA}.users u
     JOIN ${DB_SCHEMA}.approved_users au ON LOWER(au.email) = LOWER(u.email)
     WHERE au.user_status = 'active'
       AND LOWER(u.email) != LOWER($1)
       AND (
         -- Rank 0: Admin / Legal
         au.user_role IN ('Admin', 'Legal')
         -- Rank 1: WP leads
         OR EXISTS (
           SELECT 1 FROM ${DB_SCHEMA}.approved_user_leads aul
           JOIN ${DB_SCHEMA}.work_package_leads wpl ON wpl.lead_name = aul.lead_name
           JOIN ${DB_SCHEMA}.actions a ON a.work_package_id = wpl.work_package_id
           WHERE LOWER(aul.user_email) = LOWER(u.email)
             AND a.id = $2 AND a.sub_id IS NOT DISTINCT FROM $3
         )
         -- Rank 2: WP focal points
         OR EXISTS (
           SELECT 1 FROM ${DB_SCHEMA}.work_package_focal_points wpfp
           JOIN ${DB_SCHEMA}.actions a ON a.work_package_id = wpfp.work_package_id
           WHERE LOWER(wpfp.user_email) = LOWER(u.email)
             AND a.id = $2 AND a.sub_id IS NOT DISTINCT FROM $3
         )
         -- Rank 3: Action leads
         OR EXISTS (
           SELECT 1 FROM ${DB_SCHEMA}.action_leads al
           JOIN ${DB_SCHEMA}.approved_user_leads aul ON aul.lead_name = al.lead_name
           WHERE LOWER(aul.user_email) = LOWER(u.email)
             AND al.action_id = $2 AND al.action_sub_id IS NOT DISTINCT FROM $3
         )
         -- Rank 4: Action focal points
         OR EXISTS (
           SELECT 1 FROM ${DB_SCHEMA}.action_focal_points afp
           WHERE LOWER(afp.user_email) = LOWER(u.email)
             AND afp.action_id = $2 AND afp.action_sub_id IS NOT DISTINCT FROM $3
         )
       )`,
    [actorEmail, actionId, actionSubId],
  );

  if (recipients.length === 0) return;

  // Batch insert all notifications in a single query
  const valuePlaceholders: string[] = [];
  const params: (string | number | null)[] = [];
  let paramIdx = 1;

  for (const recipient of recipients) {
    valuePlaceholders.push(
      `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`,
    );
    params.push(
      recipient.id,
      input.type,
      actionId,
      actionSubId,
      input.title,
      input.body,
      actorEmail,
      input.referenceId ?? null,
      input.referenceType ?? null,
    );
  }

  await query(
    `INSERT INTO ${DB_SCHEMA}.notifications
     (user_id, type, action_id, action_sub_id, title, body, actor_email, reference_id, reference_type)
     VALUES ${valuePlaceholders.join(", ")}`,
    params,
  );
}

// =========================================================
// USER ACTIONS
// =========================================================

export async function markNotificationRead(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    await queryWithUser(
      user.email,
      `UPDATE ${DB_SCHEMA}.notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`,
      [notificationId, user.id],
    );
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to mark as read",
    };
  }
}

export async function markNotificationUnread(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    await queryWithUser(
      user.email,
      `UPDATE ${DB_SCHEMA}.notifications SET read_at = NULL WHERE id = $1 AND user_id = $2`,
      [notificationId, user.id],
    );
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to mark as unread",
    };
  }
}

export async function markAllNotificationsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    await queryWithUser(
      user.email,
      `UPDATE ${DB_SCHEMA}.notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
      [user.id],
    );
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to mark all as read",
    };
  }
}
