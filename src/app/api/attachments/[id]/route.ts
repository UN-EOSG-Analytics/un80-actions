/**
 * API Route: Delete attachment
 * DELETE /api/attachments/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteActionAttachment } from "@/features/attachments/commands";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await deleteActionAttachment(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
