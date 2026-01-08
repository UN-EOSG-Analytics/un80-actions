import type { Action, Actions } from "@/types";
// Import JSON directly for faster loading - data is bundled at build time instead of fetched at runtime
import actionsData from "../../public/data/actions.json";

/**
 * Fetch actions data from the JSON file
 * Note: JSON is imported directly (no network request) for optimal performance on GitHub Pages
 * Filters out subactions (actions with is_subaction = true) - they are stored in data but not displayed on dashboard
 * Exception: Subactions for actions 94 and 95 are included to display them in work package 31
 * @returns Promise resolving to the actions array (excluding most subactions, but including subactions for actions 94 and 95)
 */
export async function fetchActions(): Promise<Actions> {
  const allActions = actionsData as unknown as Actions;
  // Include regular actions and subactions for actions 94 and 95
  return Promise.resolve(
    allActions.filter(
      (action) => !action.is_subaction || action.action_number === 94 || action.action_number === 95,
    ),
  );
}

/**
 * Get unique values for a specific field across all actions
 * @param actions - Array of actions
 * @param field - Field name to extract unique values from
 * @returns Array of unique values
 */
export function getUniqueValues<K extends keyof Action>(
  actions: Actions,
  field: K,
): Array<Action[K]> {
  const values = actions.map((action) => action[field]);
  return Array.from(new Set(values)).filter(Boolean);
}

/**
 * Group actions by a specific field
 * @param actions - Array of actions
 * @param field - Field name to group by
 * @returns Object with field values as keys and arrays of actions as values
 */
export function groupActionsByField<K extends keyof Action>(
  actions: Actions,
  field: K,
): Record<string, Actions> {
  return actions.reduce(
    (acc, action) => {
      const key = String(action[field]);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(action);
      return acc;
    },
    {} as Record<string, Actions>,
  );
}

/**
 * Count actions by big ticket status
 * @param actions - Array of actions
 * @returns Object with counts
 */
export function countByBigTicket(actions: Actions): {
  bigTicket: number;
  notBigTicket: number;
  total: number;
} {
  const bigTicket = actions.filter((a) => a.big_ticket === true).length;
  const notBigTicket = actions.filter((a) => a.big_ticket === false).length;

  return {
    bigTicket,
    notBigTicket,
    total: actions.length,
  };
}

/**
 * Count actions by MS approval requirement
 * @param actions - Array of actions
 * @returns Object with counts
 */
export function countByMSApproval(actions: Actions): {
  requiresApproval: number;
  noApproval: number;
  total: number;
} {
  const requiresApproval = actions.filter((a) => a.ms_approval === true).length;
  const noApproval = actions.filter((a) => a.ms_approval === false).length;

  return {
    requiresApproval,
    noApproval,
    total: actions.length,
  };
}

/**
 * Get action by action number
 * @param actionNumber - The unique action number to search for
 * @param firstMilestone - Optional first milestone to distinguish subactions with the same action number
 * @returns The action with the given number (and optionally matching first milestone), or null if not found
 */
export async function getActionByNumber(
  actionNumber: number,
  firstMilestone?: string | null
): Promise<Action | null> {
  const actions = await fetchActions();
  const matchingActions = actions.filter((action) => action.action_number === actionNumber);
  
  // If no firstMilestone specified, return the first match (main action)
  if (!firstMilestone) {
    return matchingActions[0] || null;
  }
  
  // If firstMilestone is specified, find exact match
  const exactMatch = matchingActions.find(
    (action) => action.first_milestone === firstMilestone
  );
  
  // If exact match found, return it; otherwise return first match (main action)
  return exactMatch || matchingActions[0] || null;
}
