"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/get-base-url";
import { sendMagicLink } from "./mail";
import {
  clearSession,
  createMagicToken,
  createSession,
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
    const baseUrl = getBaseUrl();
    await sendMagicLink(trimmedEmail, token, baseUrl);
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
