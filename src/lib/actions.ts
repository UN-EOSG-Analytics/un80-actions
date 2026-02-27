import type { Action, Actions } from "@/types";
import { normalizeLeaderName } from "./utils";
// Import JSON directly - data is bundled at build time (no network request)
import actionsData from "@data/actions.json";

/**
 * Get filtered actions data
 * Note: JSON is imported directly for optimal performance on GitHub Pages (static export)
 * Filters out subactions (actions with is_subaction = true) - they are stored in data but not displayed on dashboard
 * Exception: Subactions for actions 94 and 95 are included to display them in work package 31
 * @returns The actions array (excluding most subactions, but including subactions for actions 94 and 95)
 */
export function getActions(): Actions {
  const allActions = actionsData as unknown as Actions;
  // Include regular actions and subactions for actions 94 and 95
  return allActions.filter(
    (action) =>
      !action.is_subaction ||
      action.action_number === 94 ||
      action.action_number === 95,
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
 * Get action by action number
 * @param actionNumber - The unique action number to search for
 * @param firstMilestone - Optional first milestone to distinguish subactions with the same action number
 * @returns The action with the given number (and optionally matching first milestone), or null if not found
 */
export function getActionByNumber(
  actionNumber: number,
  firstMilestone?: string | null,
): Action | null {
  const actions = getActions();
  const matchingActions = actions.filter(
    (action) => action.action_number === actionNumber,
  );

  // If no firstMilestone specified, return the first match (main action)
  if (!firstMilestone) {
    return matchingActions[0] || null;
  }

  // If firstMilestone is specified, find exact match
  const exactMatch = matchingActions.find(
    (action) => action.first_milestone === firstMilestone,
  );

  // If exact match found, return it; otherwise return first match (main action)
  return exactMatch || matchingActions[0] || null;
}

/**
 * Get aggregated work package leads for a given work package number
 * Aggregates leads from all actions in the work package
 * @param workPackageNumber - The work package number
 * @returns Array of unique normalized leader names
 */
export function getWorkPackageLeads(
  workPackageNumber: number | string,
): string[] {
  const actions = getActions();

  const wpActions = actions.filter(
    (action) => action.work_package_number === workPackageNumber,
  );

  const allLeads = new Set<string>();

  wpActions.forEach((action) => {
    if (action.work_package_leads && Array.isArray(action.work_package_leads)) {
      action.work_package_leads.forEach((lead) => {
        if (lead && lead.trim().length > 0) {
          const normalized = normalizeLeaderName(lead.trim());
          allLeads.add(normalized);
        }
      });
    }
  });

  return Array.from(allLeads).sort();
}
