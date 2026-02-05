"use server";

import { getCurrentUser } from "../service";
import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";

// =========================================================
// TYPES
// =========================================================

export type AdminRole = "Admin" | "Legal";

export type AuthorizedResult = {
  authorized: true;
  user: { id: string; email: string; role: AdminRole };
};

export type UnauthorizedResult = {
  authorized: false;
  error: string;
};

export type AdminCheckResult = AuthorizedResult | UnauthorizedResult;

// =========================================================
// HELPERS
// =========================================================

/**
 * Check if a user role has admin-level access (internal helper).
 * Admin and Legal roles have full access.
 */
function isAdminRole(role: string | null | undefined): role is AdminRole {
  return role === "Admin" || role === "Legal";
}

/**
 * Server-side check that requires admin access.
 * Use this at the start of any admin-only server action or query.
 * 
 * @returns AuthorizedResult with user info if authorized, UnauthorizedResult with error if not
 * 
 * @example
 * ```ts
 * const auth = await requireAdmin();
 * if (!auth.authorized) {
 *   return { success: false, error: auth.error };
 * }
 * // auth.user is now available with id, email, role
 * ```
 */
export async function requireAdmin(): Promise<AdminCheckResult> {
  const user = await getCurrentUser();
  
  if (!user) {
    return { authorized: false, error: "Not authenticated" };
  }

  // Fetch fresh role from database (not from session cache)
  const [approved] = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
    [user.email],
  );

  const role = approved?.user_role;
  
  if (!isAdminRole(role)) {
    return { authorized: false, error: "Admin access required" };
  }

  return {
    authorized: true,
    user: { id: user.id, email: user.email, role },
  };
}

/**
 * Check if current user has admin access without throwing.
 * Useful for conditional logic in queries.
 * 
 * @returns true if user is Admin or Legal, false otherwise
 */
export async function checkIsAdmin(): Promise<boolean> {
  const result = await requireAdmin();
  return result.authorized;
}
