/**
 * API Route: Download attachment
 * GET /api/attachments/[id]/download
 * Streams file directly without exposing storage URL
 */

import { NextRequest, NextResponse } from "next/server";
import { getAttachmentById } from "@/features/attachments/queries";
import { downloadBlob } from "@/lib/blob-storage";
import { getCurrentUser } from "@/features/auth/service";
import { requireAdmin } from "@/features/auth/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Admin access required to download documents" },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Get attachment metadata
    const attachment = await getAttachmentById(id);
    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    // Download blob content server-side
    const { content, contentType } = await downloadBlob(attachment.blob_name);

    // Stream to client with download headers (no URL exposure)
    // NextResponse expects BodyInit; Buffer → Uint8Array for type compatibility
    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${attachment.original_filename}"`,
        "Content-Length": content.length.toString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
