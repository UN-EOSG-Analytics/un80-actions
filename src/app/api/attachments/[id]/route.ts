/**
 * API Route: Delete attachment
 * DELETE /api/attachments/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteActionAttachment } from "@/features/attachments/commands";
import { getCurrentUser } from "@/features/auth/service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const result = await deleteActionAttachment(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
