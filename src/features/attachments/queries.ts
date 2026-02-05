/**
 * Action Attachments Queries
 * Read operations for action attachments (stored in Azure Blob Storage)
 */

"use server";

import { query } from "@/lib/db/db";
import type { ActionAttachment, AttachmentComment } from "@/types";

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

// =========================================================
// ATTACHMENT COMMENTS
// =========================================================

/**
 * Get all comments for an attachment
 */
export async function getAttachmentComments(
  attachmentId: string,
): Promise<AttachmentComment[]> {
  const rows = await query<{
    id: string;
    attachment_id: string;
    user_id: string | null;
    user_email: string | null;
    body: string | null;
    comment: string | null;
    created_at: Date;
  }>(
    `SELECT
      c.id,
      c.attachment_id,
      c.user_id,
      u.email as user_email,
      c.body,
      c.comment,
      c.created_at
    FROM un80actions.attachment_comments c
    LEFT JOIN un80actions.users u ON c.user_id = u.id
    WHERE c.attachment_id = $1
    ORDER BY c.created_at ASC`,
    [attachmentId],
  );

  return rows.map((r) => ({
    id: r.id,
    attachment_id: r.attachment_id,
    user_id: r.user_id,
    user_email: r.user_email,
    comment: r.comment ?? r.body ?? "",
    created_at: new Date(r.created_at),
  }));
}
