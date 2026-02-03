/**
 * API Route: Upload attachment
 * POST /api/attachments/upload
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadActionAttachment } from "@/features/attachments/commands";
import { getCurrentUser } from "@/features/auth/service";

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const actionId = formData.get("action_id");
    const actionSubId = formData.get("action_sub_id") as string | null;
    const milestoneId = formData.get("milestone_id") as string | null;

    if (!actionId) {
      return NextResponse.json(
        { error: "action_id is required" },
        { status: 400 },
      );
    }

    const result = await uploadActionAttachment(
      parseInt(actionId as string, 10),
      actionSubId,
      milestoneId,
      formData,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      attachmentId: result.attachmentId,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
