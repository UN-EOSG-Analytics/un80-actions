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
    // Try to get current user for tracking, but don't block if not authenticated
    const user = await getCurrentUser();
    
    console.log("Upload - Current user:", user ? { id: user.id, email: user.email } : "No user found");

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

    // Store metadata in database with user ID if available
    const userId = user?.id ?? null;
    console.log("Storing uploaded_by:", userId);
    
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
        userId,
      ],
    );

    revalidatePath("/");

    return {
      success: true,
      attachmentId: result[0].id,
    };
  } catch (error) {
    console.error("Upload error:", error);
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
    console.error("Delete error:", error);
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
    await query(
      `UPDATE un80actions.action_attachments 
       SET title = $1, description = $2
       WHERE id = $3`,
      [title, description, attachmentId],
    );

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Update error:", error);
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
    console.error("Download URL error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate URL",
    };
  }
}
