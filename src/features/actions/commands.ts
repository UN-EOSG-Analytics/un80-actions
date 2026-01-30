"use server";

import { query } from "@/lib/db/db";
import { getCurrentUser } from "@/features/auth/service";
import { DB_SCHEMA } from "@/lib/db/config";
import type { RiskAssessment } from "@/types";

// =========================================================
// TYPES
// =========================================================

export interface UpdateRiskAssessmentResult {
  success: boolean;
  error?: string;
}

// =========================================================
// COMMANDS
// =========================================================

/**
 * Update risk assessment for an action. Admin only.
 */
export async function updateRiskAssessment(
  actionId: number,
  actionSubId: string | null,
  riskAssessment: RiskAssessment | null,
): Promise<UpdateRiskAssessmentResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const adminCheck = await query<{ user_role: string }>(
    `SELECT user_role FROM ${DB_SCHEMA}.approved_users WHERE LOWER(email) = LOWER($1)`,
    [user.email],
  );

  if (adminCheck[0]?.user_role !== "Admin") {
    return { success: false, error: "Admin only" };
  }

  try {
    await query(
      `UPDATE ${DB_SCHEMA}.actions
       SET risk_assessment = $1
       WHERE id = $2 AND (sub_id IS NOT DISTINCT FROM $3)`,
      [riskAssessment, actionId, actionSubId],
    );
    return { success: true };
  } catch (e) {
    console.error("updateRiskAssessment:", e);
    return { success: false, error: "Failed to update" };
  }
}
