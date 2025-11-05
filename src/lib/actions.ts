import type { Action, Actions, ActionFilters } from "@/types/action";

/**
 * Fetch actions data from the JSON file
 * @returns Promise resolving to the actions array
 */
export async function fetchActions(): Promise<Actions> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const response = await fetch(`${basePath}/data/actions.json`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch actions: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Filter actions based on provided criteria
 * @param actions - Array of actions to filter
 * @param filters - Filter criteria
 * @returns Filtered actions array
 */
export function filterActions(
  actions: Actions,
  filters: ActionFilters
): Actions {
  return actions.filter((action) => {
    if (filters.report && action.report !== filters.report) {
      return false;
    }
    if (filters.work_package_number && action.work_package_number !== filters.work_package_number) {
      return false;
    }
    if (filters.work_package_name && action.work_package_name !== filters.work_package_name) {
      return false;
    }
    if (filters.big_ticket && action.big_ticket !== filters.big_ticket) {
      return false;
    }
    if (filters.ms_approval && action.ms_approval !== filters.ms_approval) {
      return false;
    }
    if (filters.work_package_leads && !action.work_package_leads.includes(filters.work_package_leads)) {
      return false;
    }
    return true;
  });
}

/**
 * Get unique values for a specific field across all actions
 * @param actions - Array of actions
 * @param field - Field name to extract unique values from
 * @returns Array of unique values
 */
export function getUniqueValues<K extends keyof Action>(
  actions: Actions,
  field: K
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
  field: K
): Record<string, Actions> {
  return actions.reduce((acc, action) => {
    const key = String(action[field]);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(action);
    return acc;
  }, {} as Record<string, Actions>);
}

/**
 * Convert Excel serial date to JavaScript Date object
 * Excel dates are stored as days since January 1, 1900
 * @param serial - Excel serial date number
 * @returns Date object or null if invalid
 */
export function excelDateToJSDate(serial: string | number): Date | null {
  const serialNum = typeof serial === 'string' ? parseInt(serial, 10) : serial;
  
  if (isNaN(serialNum) || serialNum <= 0) {
    return null;
  }
  
  // Excel incorrectly considers 1900 as a leap year
  // Account for this by subtracting 1 day if after Feb 28, 1900
  const excelEpoch = new Date(1900, 0, 1);
  const daysOffset = serialNum > 60 ? serialNum - 2 : serialNum - 1;
  
  const date = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  return date;
}

/**
 * Format milestone date for display
 * @param milestone - Milestone string in Excel serial format
 * @returns Formatted date string or empty string if invalid
 */
export function formatMilestone(milestone: string): string {
  if (!milestone) return "";
  
  const date = excelDateToJSDate(milestone);
  if (!date) return "";
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Parse work package leads into an array
 * @param leads - Semicolon-separated string of leads
 * @returns Array of individual leads
 */
export function parseWorkPackageLeads(leads: string): string[] {
  if (!leads) return [];
  return leads.split(';').map(lead => lead.trim()).filter(Boolean);
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
  const bigTicket = actions.filter(a => a.big_ticket === "Yes").length;
  const notBigTicket = actions.filter(a => a.big_ticket === "No").length;
  
  return {
    bigTicket,
    notBigTicket,
    total: actions.length
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
  const requiresApproval = actions.filter(a => a.ms_approval === "Yes").length;
  const noApproval = actions.filter(a => a.ms_approval === "No").length;
  
  return {
    requiresApproval,
    noApproval,
    total: actions.length
  };
}
