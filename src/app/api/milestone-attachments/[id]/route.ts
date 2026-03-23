import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { queryWithUser } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { requireAdmin } from "@/features/auth/lib/permissions";

const UPLOAD_DIR = "uploads/milestone-attachments";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 403 },
    );
  }

  const rows = await queryWithUser<{ file_path: string; file_name: string }>(
    auth.user.email,
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
