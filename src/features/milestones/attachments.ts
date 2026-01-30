"use server";

import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { query } from "@/lib/db/db";
import { getCurrentUser } from "@/features/auth/service";
import { DB_SCHEMA } from "@/lib/db/config";
import type { MilestoneAttachment } from "@/types";
import { getMilestoneById } from "./queries";

const UPLOAD_DIR = "uploads/milestone-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "text/plain",
  "text/csv",
];

async function canAccessActionForUpload(
  userEmail: string,
  actionId: number,
  actionSubId: string | null,
): Promise<boolean> {
  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
    [userEmail],
  );
  if (adminCheck[0]?.user_role === "Admin") return true;

  const perm = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM (
      SELECT 1 FROM ${DB_SCHEMA}.action_focal_points
        WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2) AND user_email = $3
      UNION ALL
      SELECT 1 FROM ${DB_SCHEMA}.action_support_persons
        WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2) AND user_email = $3
      UNION ALL
      SELECT 1 FROM ${DB_SCHEMA}.action_member_persons
        WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2) AND user_email = $3
    ) AS p`,
    [actionId, actionSubId, userEmail],
  );
  return parseInt(perm[0]?.count || "0") > 0;
}

export async function getMilestoneAttachmentCount(
  milestoneId: string,
): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${DB_SCHEMA}.milestone_attachments WHERE milestone_id = $1`,
    [milestoneId],
  );
  return parseInt(rows[0]?.count || "0", 10);
}

export async function getMilestoneAttachments(
  milestoneId: string,
): Promise<MilestoneAttachment[]> {
  const rows = await query<MilestoneAttachment>(
    `SELECT id, milestone_id, file_name, file_path, content_type, file_size,
            uploaded_by, uploaded_at
     FROM ${DB_SCHEMA}.milestone_attachments
     WHERE milestone_id = $1
     ORDER BY uploaded_at DESC`,
    [milestoneId],
  );
  return rows;
}

export async function canViewAttachments(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
    [user.email],
  );
  return adminCheck[0]?.user_role === "Admin";
}

export interface UploadAttachmentResult {
  success: boolean;
  error?: string;
  attachment?: MilestoneAttachment;
}

export async function uploadMilestoneAttachment(
  milestoneId: string,
  formData: FormData,
): Promise<UploadAttachmentResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const milestone = await getMilestoneById(milestoneId);
  if (!milestone) return { success: false, error: "Milestone not found" };

  const canUpload = await canAccessActionForUpload(
    user.email,
    milestone.action_id,
    milestone.action_sub_id,
  );
  if (!canUpload) return { success: false, error: "Not authorized to upload" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, error: "No file" };

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "File too large (max 10 MB)" };
  }

  const contentType = file.type;
  if (!ALLOWED_TYPES.includes(contentType) && !contentType.startsWith("image/")) {
    return {
      success: false,
      error: "File type not allowed. Use PDF, Word, images, or text.",
    };
  }

  const ext = path.extname(file.name) || "";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const relativePath = path.join(milestoneId, uniqueName);
  const fullPath = path.join(process.cwd(), UPLOAD_DIR, relativePath);

  try {
    await mkdir(path.dirname(fullPath), { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(fullPath, Buffer.from(bytes));
  } catch (e) {
    console.error("Upload write failed:", e);
    return { success: false, error: "Failed to save file" };
  }

  const rows = await query<MilestoneAttachment>(
    `INSERT INTO ${DB_SCHEMA}.milestone_attachments
     (milestone_id, file_name, file_path, content_type, file_size, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, milestone_id, file_name, file_path, content_type, file_size,
               uploaded_by, uploaded_at`,
    [milestoneId, safeName, relativePath, contentType, file.size, user.id],
  );

  return { success: true, attachment: rows[0] };
}

export interface DeleteAttachmentResult {
  success: boolean;
  error?: string;
}

export async function deleteMilestoneAttachment(
  attachmentId: string,
): Promise<DeleteAttachmentResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
    [user.email],
  );
  if (adminCheck[0]?.user_role !== "Admin") {
    return { success: false, error: "Admin only" };
  }

  const rows = await query<{ file_path: string }>(
    `SELECT file_path FROM ${DB_SCHEMA}.milestone_attachments WHERE id = $1`,
    [attachmentId],
  );
  if (!rows[0]) return { success: false, error: "Attachment not found" };

  await query(
    `DELETE FROM ${DB_SCHEMA}.milestone_attachments WHERE id = $1`,
    [attachmentId],
  );

  const fullPath = path.join(process.cwd(), UPLOAD_DIR, rows[0].file_path);
  try {
    await unlink(fullPath);
  } catch {
    // Ignore if file already missing
  }

  return { success: true };
}
