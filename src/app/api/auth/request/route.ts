import { NextResponse } from "next/server";
import {
  isApprovedUser,
  createMagicToken,
  recentTokenExists,
} from "@/features/auth/service";
import { sendMagicLink } from "@/features/auth/mail";
import { getBaseUrl } from "@/lib/get-base-url";

export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!email || typeof email !== "string")
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!(await isApprovedUser(email)))
    return NextResponse.json(
      { error: "Email not in approved users list" },
      { status: 403 },
    );
  if (await recentTokenExists(email))
    return NextResponse.json(
      { error: "Magic link recently sent. Check your email or wait." },
      { status: 429 },
    );
  const token = await createMagicToken(email);
  const baseUrl = getBaseUrl();
  await sendMagicLink(email, token, baseUrl);
  return NextResponse.json({ ok: true });
}
