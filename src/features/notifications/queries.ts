"use server";

import { queryWithUser } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { getCurrentUser } from "@/features/auth/service";
import type { Notification, NotificationType } from "@/types";

export async function getNotifications(
  limit: number = 50,
  typeFilter?: NotificationType,
): Promise<Notification[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const whereClause = typeFilter
    ? `AND n.type = $2`
    : "";
  const params: (string | number)[] = [user.id];
  if (typeFilter) params.push(typeFilter);

  return queryWithUser<Notification>(
    user.email,
    `SELECT
      n.id,
      n.user_id,
      n.type,
      n.action_id,
      n.action_sub_id,
      n.title,
      n.body,
      n.actor_email,
      n.reference_id,
      n.reference_type,
      n.read_at,
      n.created_at
    FROM ${DB_SCHEMA}.notifications n
    WHERE n.user_id = $1 ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT $${params.length + 1}`,
    [...params, limit],
  );
}

export async function getUnreadNotificationCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  const rows = await queryWithUser<{ count: string }>(
    user.email,
    `SELECT COUNT(*)::text AS count
     FROM ${DB_SCHEMA}.notifications
     WHERE user_id = $1 AND read_at IS NULL`,
    [user.id],
  );

  return parseInt(rows[0]?.count ?? "0", 10);
}
