"use server";

import { getActionMilestones } from "@/features/milestones/queries";
import { getActionNotes } from "@/features/notes/queries";
import type { ActionMilestone, ActionNote } from "@/types";

/**
 * Server actions for QuestionsTab to fetch milestones and notes without
 * importing server-only query modules in a client component.
 */
export async function fetchActionMilestonesForTab(
  actionId: number,
  actionSubId: string | null,
): Promise<ActionMilestone[]> {
  return getActionMilestones(actionId, actionSubId);
}

export async function fetchActionNotesForTab(
  actionId: number,
  actionSubId: string | null,
): Promise<ActionNote[]> {
  return getActionNotes(actionId, actionSubId);
}
