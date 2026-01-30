import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/features/auth/service";
import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";

const UPLOAD_DIR = "uploads/milestone-attachments";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
    [user.email],
  );
  if (adminCheck[0]?.user_role !== "Admin") {
    return NextResponse.json(
      { error: "Documents are only accessible to admins" },
      { status: 403 },
    );
  }

  const rows = await query<{ file_path: string; file_name: string }>(
    `SELECT file_path, file_name FROM ${DB_SCHEMA}.milestone_attachments WHERE id = $1`,
    [id],
  );
  if (!rows[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fullPath = path.join(process.cwd(), UPLOAD_DIR, rows[0].file_path);
  try {
    const buffer = await readFile(fullPath);
    const fileName = rows[0].file_name;
    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, '\\"')}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
