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
 * Create a new entity in the entities table. Admin only.
 */
export async function createEntity(
  entity: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const trimmed = entity.trim();
  if (!trimmed) return { success: false, error: "Entity name cannot be empty" };

  try {
    await query(
      `INSERT INTO ${DB_SCHEMA}.entities (entity) VALUES ($1) ON CONFLICT DO NOTHING`,
      [trimmed],
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create entity" };
  }
}

/**
 * Replace all action team member entities for an action. Admin only.
 */
export async function updateActionEntities(
  actionId: number,
  actionSubId: string | null,
  entities: string[],
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    await query(
      `DELETE FROM ${DB_SCHEMA}.action_member_entities
       WHERE action_id = $1 AND (action_sub_id IS NOT DISTINCT FROM $2)`,
      [actionId, actionSubId ?? ""],
    );
    for (const entity of entities) {
      await query(
        `INSERT INTO ${DB_SCHEMA}.action_member_entities (action_id, action_sub_id, entity)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [actionId, actionSubId ?? "", entity],
      );
    }
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update team members" };
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
