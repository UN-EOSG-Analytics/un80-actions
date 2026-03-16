"use server";

import { query } from "@/lib/db/db";
import { DB_SCHEMA } from "@/lib/db/config";
import { requireAdmin } from "@/features/auth/lib/permissions";
import type { RiskAssessment } from "@/types";

// =========================================================
// TYPES
// =========================================================

export interface UpdateRiskAssessmentResult {
  success: boolean;
  error?: string;
}

export interface UpdatePublicStatusResult {
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
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    await query(
      `UPDATE ${DB_SCHEMA}.actions
       SET risk_assessment = $1
       WHERE id = $2 AND (sub_id IS NOT DISTINCT FROM $3)`,
      [riskAssessment, actionId, actionSubId],
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update" };
  }
}

/**
 * Update public action status for an action. Admin only.
 */
export async function updatePublicActionStatus(
  actionId: number,
  actionSubId: string | null,
  publicActionStatus: string | null,
): Promise<UpdatePublicStatusResult> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    await query(
      `UPDATE ${DB_SCHEMA}.actions
       SET public_action_status = $1
       WHERE id = $2 AND (sub_id IS NOT DISTINCT FROM $3)`,
      [publicActionStatus, actionId, actionSubId],
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update" };
  }
}
