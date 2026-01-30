"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  isApprovedUser,
  createMagicToken,
  verifyMagicToken,
  upsertUser,
  createSession,
  clearSession,
  recentTokenExists,
} from "./auth";
import { sendMagicLink } from "./mail";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function requestMagicLinkAction(
  email: string,
): Promise<ActionResult> {
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
    await sendMagicLink(trimmedEmail, token);
    return { success: true };
  } catch (error) {
    console.error("Error sending magic link:", error);
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

export async function verifyMagicTokenAction(
  token: string,
): Promise<ActionResult> {
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

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
