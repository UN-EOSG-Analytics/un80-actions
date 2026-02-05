/**
 * Action Attachments Commands
 * Write operations for action attachments
 */

"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db/db";
import { getCurrentUser } from "@/features/auth/service";
import {
  uploadBlob,
  deleteBlob,
  generateBlobName,
  generateDownloadUrl,
} from "@/lib/blob-storage";

interface UploadResult {
  success: boolean;
  error?: string;
  attachmentId?: string;
}

interface DeleteResult {
  success: boolean;
  error?: string;
}

interface DownloadUrlResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload an attachment for an action
 * Can be general or linked to a specific milestone
 */
export async function uploadActionAttachment(
  actionId: number,
  actionSubId: string | null,
  milestoneId: string | null,
  formData: FormData,
): Promise<UploadResult> {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: "File too large (max 50MB)" };
    }

    // Generate unique blob name
    const blobName = generateBlobName(file.name);

    // Upload to Azure Blob Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await uploadBlob(blobName, buffer, file.type);

    // Store metadata in database
    const result = await query<{ id: string }>(
      `INSERT INTO un80actions.action_attachments (
        action_id,
        action_sub_id,
        milestone_id,
        title,
        description,
        filename,
        original_filename,
        blob_name,
        content_type,
        file_size,
        uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        actionId,
        actionSubId,
        milestoneId,
        formData.get("title") || null,
        formData.get("description") || null,
        file.name,
        file.name,
        blobName,
        file.type,
        file.size,
        user.id,
      ],
    );

    revalidatePath("/");

    return {
      success: true,
      attachmentId: result[0].id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete an attachment
 * Also removes the file from blob storage
 */
export async function deleteActionAttachment(
  attachmentId: string,
): Promise<DeleteResult> {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get attachment details
    const rows = await query<{
      blob_name: string;
    }>(
      `SELECT blob_name
       FROM un80actions.action_attachments 
       WHERE id = $1`,
      [attachmentId],
    );

    if (rows.length === 0) {
      return { success: false, error: "Attachment not found" };
    }

    const attachment = rows[0];

    // Delete from blob storage
    await deleteBlob(attachment.blob_name);

    // Delete from database
    await query(
      `DELETE FROM un80actions.action_attachments WHERE id = $1`,
      [attachmentId],
    );

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

/**
 * Update attachment title and description
 */
export async function updateAttachmentMetadata(
  attachmentId: string,
  title: string | null,
  description: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await query(
      `UPDATE un80actions.action_attachments 
       SET title = $1, description = $2
       WHERE id = $3`,
      [title, description, attachmentId],
    );

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

/**
 * Generate a temporary download URL for an attachment
 * URL is valid for 1 hour
 */
export async function getAttachmentDownloadUrl(
  attachmentId: string,
): Promise<DownloadUrlResult> {
  try {
    // Get blob name from database
    const rows = await query<{ blob_name: string; original_filename: string }>(
      `SELECT blob_name, original_filename 
       FROM un80actions.action_attachments 
       WHERE id = $1`,
      [attachmentId],
    );

    if (rows.length === 0) {
      return { success: false, error: "Attachment not found" };
    }

    // Generate SAS URL (valid for 60 minutes)
    const url = await generateDownloadUrl(rows[0].blob_name, 60);

    return { success: true, url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate URL",
    };
  }
}

// =========================================================
// ATTACHMENT COMMENTS
// =========================================================

/** Shape returned by createAttachmentComment (created_at is ISO string after serialization) */
export interface AttachmentCommentResult {
  id: string;
  attachment_id: string;
  user_id: string | null;
  user_email: string | null;
  comment: string;
  created_at: Date | string;
}

export interface CreateAttachmentCommentResult {
  success: boolean;
  error?: string;
  comment?: AttachmentCommentResult;
}

/**
 * Add a comment to an attachment
 */
export async function createAttachmentComment(
  attachmentId: string,
  comment: string,
): Promise<CreateAttachmentCommentResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const trimmed = comment.trim();
    if (!trimmed) {
      return { success: false, error: "Comment cannot be empty" };
    }

    // Verify attachment exists and belongs to an action the user can access (same action context is assumed via UI)
    const attachmentRows = await query<{ id: string }>(
      `SELECT id FROM un80actions.action_attachments WHERE id = $1`,
      [attachmentId],
    );
    if (attachmentRows.length === 0) {
      return { success: false, error: "Attachment not found" };
    }

    const rows = await query<{
      id: string;
      attachment_id: string;
      user_id: string | null;
      body: string;
      comment: string;
      created_at: Date;
    }>(
      `INSERT INTO un80actions.attachment_comments (attachment_id, user_id, body, comment)
       VALUES ($1, $2, $3, $3)
       RETURNING id, attachment_id, user_id, body, comment, created_at`,
      [attachmentId, user.id, trimmed],
    );

    const row = rows[0];
    const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
    const text = row.comment ?? row.body;

    revalidatePath("/");

    return {
      success: true,
      comment: {
        id: row.id,
        attachment_id: row.attachment_id,
        user_id: row.user_id,
        user_email: user.email,
        comment: text,
        created_at: createdAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}
