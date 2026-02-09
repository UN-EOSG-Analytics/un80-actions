"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/get-base-url";
import { sendMagicLink } from "./mail";
import {
  clearSession,
  createMagicToken,
  createSession,
  getCurrentUser,
  isApprovedUser,
  recentTokenExists,
  upsertUser,
  verifyMagicToken,
} from "./service";

type Result<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function requestMagicLink(email: string): Promise<Result> {
  if (!email || typeof email !== "string" || !email.trim()) {
    return { success: false, error: "Email required" };
  }
  const trimmedEmail = email.trim();
  if (!(await isApprovedUser(trimmedEmail))) {
    return { success: false, error: "Email not in approved users list" };
  }
  if (await recentTokenExists(trimmedEmail)) {
    return {
      success: false,
      error:
        "A magic link was recently sent. Please check your email or wait a few minutes.",
    };
  }
  try {
    const token = await createMagicToken(trimmedEmail);
    const baseUrl = await getBaseUrl();
    await sendMagicLink(trimmedEmail, token, baseUrl);
    return { success: true };
  } catch (error) {
    const msg =
      error instanceof Error && error.message
        ? error.message
        : "Failed to send email. Please try again.";

    return {
      success: false,
      error:
        process.env.NODE_ENV === "development"
          ? `Email failed: ${msg}`
          : "Failed to send email. Please try again.",
    };
  }
}

export async function verify(token: string): Promise<Result> {
  if (!token || typeof token !== "string") {
    return { success: false, error: "Missing token" };
  }
  const email = await verifyMagicToken(token);
  if (!email) {
    return { success: false, error: "Invalid or expired link" };
  }
  const userId = await upsertUser(email);
  await createSession(userId);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}

/**
 * Returns the current user's id for client-side use (e.g. to show edit/delete on own comments).
 */
export async function getCurrentUserIdForClient(): Promise<{ userId: string | null }> {
  const user = await getCurrentUser();
  return { userId: user?.id ?? null };
}

/**
 * Toggle admin role for testing purposes.
 * DEV ONLY - remove in production.
 */
export async function toggleAdminRole(): Promise<Result> {
  const { getCurrentUser } = await import("./service");
  const { query } = await import("@/lib/db/db");
  const { DB_SCHEMA } = await import("@/lib/db/config");

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get current role
  const [current] = await query<{ user_role: string | null }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
    [user.email],
  );

  // Toggle between Admin and null
  const newRole = current?.user_role === "Admin" ? null : "Admin";

  await query(
    `UPDATE ${DB_SCHEMA}.approved_users SET user_role = $1 WHERE LOWER(email) = LOWER($2)`,
    [newRole, user.email],
  );

  revalidatePath("/", "layout");
  return { success: true };
}
