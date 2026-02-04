/**
 * Action Attachments Queries
 * Read operations for action attachments (stored in Azure Blob Storage)
 */

"use server";

import { query } from "@/lib/db/db";
import type { ActionAttachment } from "@/types";

/**
 * Get all attachments for an action (general + milestone-specific)
 */
export async function getActionAttachments(
  actionId: number,
  actionSubId: string | null,
): Promise<ActionAttachment[]> {
  const rows = await query<ActionAttachment>(
    `SELECT 
      aa.id,
      aa.action_id,
      aa.action_sub_id,
      aa.milestone_id,
      aa.title,
      aa.description,
      aa.filename,
      aa.original_filename,
      aa.blob_name,
      aa.content_type,
      aa.file_size,
      aa.uploaded_by,
      u.email as uploaded_by_email,
      aa.uploaded_at
    FROM un80actions.action_attachments aa
    LEFT JOIN un80actions.users u ON aa.uploaded_by = u.id
    WHERE aa.action_id = $1 
      AND (aa.action_sub_id = $2 OR (aa.action_sub_id IS NULL AND $2 IS NULL))
    ORDER BY aa.uploaded_at DESC`,
    [actionId, actionSubId],
  );

  return rows.map((r) => ({
    ...r,
    uploaded_at: new Date(r.uploaded_at),
  }));
}

/**
 * Get attachment count for an action
 */
export async function getActionAttachmentCount(
  actionId: number,
  actionSubId: string | null,
): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count
    FROM un80actions.action_attachments
    WHERE action_id = $1 
      AND (action_sub_id = $2 OR (action_sub_id IS NULL AND $2 IS NULL))`,
    [actionId, actionSubId],
  );

  return parseInt(result[0]?.count ?? "0", 10);
}

/**
 * Get a single attachment by ID
 */
export async function getAttachmentById(
  attachmentId: string,
): Promise<ActionAttachment | null> {
  const rows = await query<ActionAttachment>(
    `SELECT 
      aa.id,
      aa.action_id,
      aa.action_sub_id,
      aa.milestone_id,
      aa.title,
      aa.description,
      aa.filename,
      aa.original_filename,
      aa.blob_name,
      aa.content_type,
      aa.file_size,
      aa.uploaded_by,
      u.email as uploaded_by_email,
      aa.uploaded_at
    FROM un80actions.action_attachments aa
    LEFT JOIN un80actions.users u ON aa.uploaded_by = u.id
    WHERE aa.id = $1`,
    [attachmentId],
  );

  if (rows.length === 0) return null;

  return {
    ...rows[0],
    uploaded_at: new Date(rows[0].uploaded_at),
  };
}
