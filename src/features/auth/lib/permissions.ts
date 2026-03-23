"use server";

import { getCurrentUser } from "../service";
import { query, queryWithUser } from "@/lib/db/db";
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

// =========================================================
// WRITE ACCESS (ranks 0–4)
// =========================================================

export type WriteAccessAuthorized = {
  authorized: true;
  user: { id: string; email: string; isAdmin: boolean };
};

export type WriteAccessResult = WriteAccessAuthorized | UnauthorizedResult;

/**
 * Check if current user has write access to a specific action.
 * Ranks 0–4 (Admin/Legal, WP lead, WP focal point, action lead, action focal point) have write access.
 * Ranks 5–6 (member persons, support persons) are read-only.
 *
 * Uses plain query() since assignment tables have no RLS.
 */
export async function requireWriteAccess(
  actionId: number,
  actionSubId: string | null,
): Promise<WriteAccessResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { authorized: false, error: "Not authenticated" };
  }

  // Admin/Legal: short-circuit
  const [approved] = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
    [user.email],
  );
  const role = approved?.user_role;
  if (isAdminRole(role)) {
    return {
      authorized: true,
      user: { id: user.id, email: user.email, isAdmin: true },
    };
  }

  // Check ranks 1–4
  // Uses queryWithUser because ranks 1–2 join through the actions table (RLS-protected)
  const [result] = await queryWithUser<{ has_access: boolean }>(
    user.email,
    `SELECT EXISTS (
      SELECT 1 FROM ${DB_SCHEMA}.approved_user_leads aul
      JOIN ${DB_SCHEMA}.work_package_leads wpl ON wpl.lead_name = aul.lead_name
      JOIN ${DB_SCHEMA}.actions a ON a.work_package_id = wpl.work_package_id
      WHERE LOWER(aul.user_email) = LOWER($1)
        AND a.id = $2 AND (a.sub_id IS NOT DISTINCT FROM $3)
      UNION ALL
      SELECT 1 FROM ${DB_SCHEMA}.work_package_focal_points wpfp
      JOIN ${DB_SCHEMA}.actions a ON a.work_package_id = wpfp.work_package_id
      WHERE LOWER(wpfp.user_email) = LOWER($1)
        AND a.id = $2 AND (a.sub_id IS NOT DISTINCT FROM $3)
      UNION ALL
      SELECT 1 FROM ${DB_SCHEMA}.action_leads al
      JOIN ${DB_SCHEMA}.approved_user_leads aul ON aul.lead_name = al.lead_name
      WHERE LOWER(aul.user_email) = LOWER($1)
        AND al.action_id = $2 AND (al.action_sub_id IS NOT DISTINCT FROM $3)
      UNION ALL
      SELECT 1 FROM ${DB_SCHEMA}.action_focal_points afp
      WHERE LOWER(afp.user_email) = LOWER($1)
        AND afp.action_id = $2 AND (afp.action_sub_id IS NOT DISTINCT FROM $3)
    ) AS has_access`,
    [user.email, actionId, actionSubId],
  );

  if (!result?.has_access) {
    return {
      authorized: false,
      error: "You do not have write access to this action",
    };
  }

  return {
    authorized: true,
    user: { id: user.id, email: user.email, isAdmin: false },
  };
}

/**
 * Check if current user can edit a specific action (boolean helper for UI).
 * Returns true for ranks 0–4, false for ranks 5–6 or unauthenticated.
 */
export async function checkCanEditAction(
  actionId: number,
  actionSubId: string | null,
): Promise<boolean> {
  const result = await requireWriteAccess(actionId, actionSubId);
  return result.authorized;
}
