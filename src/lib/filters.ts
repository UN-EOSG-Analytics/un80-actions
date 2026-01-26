import type {
  Actions,
  WorkPackage,
  LeadChartEntry,
  WorkstreamChartEntry,
  WorkPackageChartEntry,
  UpcomingMilestoneChartEntry,
  StatsData,
  FilterState,
} from "@/types";
import { normalizeLeaderName, normalizeTeamMember } from "./utils";

// WP Families mapping (by work package number)
const WP_FAMILY_2 = ["3", "4", "5", "6", "12"];
const WP_FAMILY_3 = ["14", "18", "15", "2"];
const WP_FAMILY_4 = ["2", "16", "17", "7", "8"];

function getWpNumbersForFamily(
  familyKey: string,
  workPackages: WorkPackage[],
): string[] {
  // Collect Big Ticket WP numbers from data
  const bigTicketNumbers = Array.from(
    new Set(
      workPackages
        .filter((wp) => wp.bigTicket === true && typeof wp.number === "number")
        .map((wp) => String(wp.number)),
    ),
  );

  const otherFamiliesUnion = new Set([
    ...WP_FAMILY_2,
    ...WP_FAMILY_3,
    ...WP_FAMILY_4,
  ]);

  switch (familyKey) {
    case "family2":
      return WP_FAMILY_2;
    case "family3":
      return WP_FAMILY_3;
    case "family4":
      return WP_FAMILY_4;
    // family1 = "rest of Big Ticket work packages" (plus WP 2)
    case "family1":
    default:
      return bigTicketNumbers.filter(
        (n) => n === "2" || !otherFamiliesUnion.has(n),
      );
  }
}

/**
 * Filter work packages based on filter state
 * @param workPackages - Array of work packages to filter
 * @param filters - Filter state
 * @returns Filtered work packages
 */
export function filterWorkPackages(
  workPackages: WorkPackage[],
  filters: FilterState,
): WorkPackage[] {
  let filtered = workPackages;

  // Search filter
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase();
    const queryWords = query.split(/\s+/);
    filtered = filtered.filter(
      (wp) =>
        wp.name.toLowerCase().includes(query) ||
        String(wp.number).includes(query) ||
        wp.leads.some((lead) => lead.toLowerCase().includes(query)) ||
        wp.actions.some(
          (action) =>
            action.text.toLowerCase().includes(query) ||
            queryWords.some((w) => w === String(action.actionNumber)),
        ),
    );
  }

  // Work Package filter (supports multiple selections)
  if (filters.selectedWorkPackage && filters.selectedWorkPackage.length > 0) {
    const selectedNumbers = filters.selectedWorkPackage.map((wp) => {
      const wpMatch = wp.match(/^(\d+):/);
      return wpMatch ? wpMatch[1] : wp;
    });

    filtered = filtered.filter((wp) => {
      if (wp.number) {
        return selectedNumbers.includes(String(wp.number));
      } else {
        return selectedNumbers.includes(wp.name);
      }
    });
  }

  // WP Families filter (single select, maps to specific WP numbers)
  if (filters.selectedWpFamily) {
    const allowedNumbers = new Set(
      getWpNumbersForFamily(filters.selectedWpFamily, workPackages),
    );

    filtered = filtered.filter((wp) => {
      if (typeof wp.number === "number") {
        return allowedNumbers.has(String(wp.number));
      }
      return false;
    });
  }

  // Lead filter (supports multiple selections)
  if (filters.selectedLead && filters.selectedLead.length > 0) {
    filtered = filtered.filter((wp) =>
      wp.leads.some((lead) => filters.selectedLead.includes(lead)),
    );
  }

  // Workstream filter (supports multiple selections)
  if (filters.selectedWorkstream && filters.selectedWorkstream.length > 0) {
    filtered = filtered.filter((wp) =>
      filters.selectedWorkstream.some((ws) => wp.report.includes(ws)),
    );
  }

  // Big Ticket filter (supports multiple selections)
  if (filters.selectedBigTicket && filters.selectedBigTicket.length > 0) {
    const hasBigTicket = filters.selectedBigTicket.includes("big-ticket");
    const hasOther = filters.selectedBigTicket.includes("other");

    if (hasBigTicket && hasOther) {
      // Both selected, show all
      // No filtering needed
    } else if (hasBigTicket) {
      filtered = filtered.filter((wp) => wp.bigTicket === true);
    } else if (hasOther) {
      filtered = filtered.filter((wp) => wp.bigTicket === false);
    }
  }

  // Action filter (supports multiple selections)
  if (filters.selectedAction && filters.selectedAction.length > 0) {
    filtered = filtered.filter((wp) =>
      wp.actions.some((action) => {
        const actionText = action.text ? action.text.trim() : "";
        return filters.selectedAction.some((selected) => {
          const selectedTrimmed = selected.trim();
          return actionText === selectedTrimmed;
        });
      }),
    );
  }

  // Action Status filter (supports multiple selections)
  if (filters.selectedActionStatus && filters.selectedActionStatus.length > 0) {
    filtered = filtered.filter((wp) => {
      const hasMatchingAction = wp.actions.some((action) => {
        // Case-insensitive comparison to handle variations
        const actionStatusLower = action.actionStatus?.toLowerCase() || "";
        return filters.selectedActionStatus.some(
          (status) => status.toLowerCase() === actionStatusLower,
        );
      });
      return hasMatchingAction;
    });
  }

  // Note: Team Member filter is applied at the action level in ListContainer,
  // not at the work package level, so we don't filter work packages here

  // Sort filtered work packages
  if (filters.sortOption) {
    filtered = [...filtered].sort((a, b) => {
      switch (filters.sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "number-asc": {
          const numA = typeof a.number === "number" ? a.number : 0;
          const numB = typeof b.number === "number" ? b.number : 0;
          if (numA !== numB) return numA - numB;
          return a.name.localeCompare(b.name);
        }
        case "number-desc": {
          const numA = typeof a.number === "number" ? a.number : 0;
          const numB = typeof b.number === "number" ? b.number : 0;
          if (numA !== numB) return numB - numA;
          return a.name.localeCompare(b.name);
        }
        default:
          return 0;
      }
    });
  }

  return filtered;
}

/**
 * Get unique work packages for filter options
 * @param workPackages - Array of work packages
 * @returns Sorted array of unique work package names
 */
export function getUniqueWorkPackages(workPackages: WorkPackage[]): string[] {
  const unique = Array.from(
    new Set(
      workPackages.map((wp) =>
        wp.number ? `${wp.number}: ${wp.name ?? ""}` : (wp.name ?? ""),
      ),
    ),
  ).filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return unique.sort((a, b) => {
    // Extract numbers from strings like "1: Name" or "10: Name"
    const numA = parseInt(a.split(":")[0] || "") || 0;
    const numB = parseInt(b.split(":")[0] || "") || 0;
    return numA - numB;
  });
}

/**
 * Get unique leads for filter options
 * @param workPackages - Array of work packages
 * @returns Sorted array of unique leads
 */
export function getUniqueLeads(workPackages: WorkPackage[]): string[] {
  const leads = new Set<string>();
  workPackages.forEach((wp) => {
    wp.leads.forEach((lead) => leads.add(lead));
  });
  return Array.from(leads).sort();
}

/**
 * Get unique workstreams for filter options
 * @param workPackages - Array of work packages
 * @returns Sorted array of unique workstreams
 */
export function getUniqueWorkstreams(workPackages: WorkPackage[]): string[] {
  const workstreams = new Set<string>();
  workPackages.forEach((wp) => {
    wp.report.forEach((ws) => workstreams.add(ws));
  });
  return Array.from(workstreams).sort();
}

/**
 * Get unique team members (action entities) for filter options
 * @param workPackages - Array of work packages
 * @returns Sorted array of unique team member names
 */
export function getUniqueTeamMembers(workPackages: WorkPackage[]): string[] {
  const teamMembers = new Set<string>();
  workPackages.forEach((wp) => {
    wp.actions.forEach((action) => {
      if (action.actionEntities && action.actionEntities.trim()) {
        const entities = action.actionEntities
          .split(";")
          .map((e) => e.trim())
          .filter(Boolean);
        entities.forEach((entity) => {
          const normalized = normalizeTeamMember(entity);
          if (normalized) {
            teamMembers.add(normalized);
          }
        });
      }
    });
  });
  return Array.from(teamMembers).sort();
}

/**
 * Get unique actions for filter options with their action numbers
 * @param workPackages - Array of work packages
 * @returns Array of unique actions with number and text, sorted by action number
 */
export function getUniqueActions(
  workPackages: WorkPackage[],
): Array<{ text: string; actionNumber: string }> {
  const actionsMap = new Map<string, string>(); // text -> actionNumber
  workPackages.forEach((wp) => {
    wp.actions.forEach((action) => {
      if (action.text && action.text.trim()) {
        const trimmedText = action.text.trim();
        // Use the first action number found for each unique text
        if (!actionsMap.has(trimmedText)) {
          actionsMap.set(trimmedText, String(action.actionNumber || ""));
        }
      }
    });
  });
  return Array.from(actionsMap.entries())
    .map(([text, actionNumber]) => ({ text, actionNumber }))
    .sort((a, b) => {
      // Sort by action number (numeric) first, then by text
      const numA = parseInt(a.actionNumber) || 0;
      const numB = parseInt(b.actionNumber) || 0;
      if (numA !== numB) return numA - numB;
      return a.text.localeCompare(b.text);
    });
}

/**
 * Calculate chart data for work packages per lead
 * @param workPackages - Array of work packages
 * @param searchQuery - Optional search query to filter leads
 * @param selectedWorkstream - Optional selected workstreams to filter by
 * @param selectedWorkPackage - Optional selected work packages to filter by
 * @returns Array of lead chart entries sorted by count descending
 */
export function calculateLeadChartData(
  workPackages: WorkPackage[],
  searchQuery = "",
  selectedWorkstream: string[] = [],
  selectedWorkPackage: string[] = [],
): LeadChartEntry[] {
  const leadCounts = new Map<string, number>();

  // Filter work packages based on other chart selections
  let filteredWPs = workPackages;

  if (selectedWorkstream.length > 0) {
    filteredWPs = filteredWPs.filter((wp) =>
      selectedWorkstream.some((ws) => wp.report.includes(ws)),
    );
  }

  if (selectedWorkPackage.length > 0) {
    const selectedNumbers = selectedWorkPackage.map((wp) => {
      const wpMatch = wp.match(/^(\d+):/);
      return wpMatch ? wpMatch[1] : wp;
    });
    filteredWPs = filteredWPs.filter((wp) => {
      if (wp.number) {
        return selectedNumbers.includes(String(wp.number));
      } else {
        return selectedNumbers.includes(wp.name);
      }
    });
  }

  filteredWPs.forEach((wp) => {
    wp.leads.forEach((lead) => {
      // Normalize leader name (e.g., "ASG UNITAR" -> "ED UNITAR")
      const normalizedLead = normalizeLeaderName(lead);

      // Filter by chart search query if provided
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!normalizedLead.toLowerCase().includes(query)) {
          return;
        }
      }
      const currentCount = leadCounts.get(normalizedLead) || 0;
      leadCounts.set(normalizedLead, currentCount + 1);
    });
  });

  return Array.from(leadCounts.entries())
    .map(([lead, count]) => ({ lead, count }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

/**
 * Calculate chart data for actions per workstream
 * @param actions - Array of actions
 * @param searchQuery - Optional search query to filter workstreams
 * @param selectedLead - Optional selected leads to filter by
 * @param selectedWorkPackage - Optional selected work packages to filter by
 * @returns Array of workstream chart entries sorted by count descending
 */
export function calculateWorkstreamChartData(
  actions: Actions,
  searchQuery = "",
  selectedLead: string[] = [],
  selectedWorkPackage: string[] = [],
): WorkstreamChartEntry[] {
  const workstreamCounts = new Map<string, number>();

  // Filter actions based on other chart selections
  let filteredActions = actions;

  if (selectedLead.length > 0) {
    filteredActions = filteredActions.filter(
      (action) =>
        Array.isArray(action.work_package_leads) &&
        action.work_package_leads.some((lead) =>
          selectedLead.includes(normalizeLeaderName(lead)),
        ),
    );
  }

  if (selectedWorkPackage.length > 0) {
    const selectedNumbers = selectedWorkPackage.map((wp) => {
      const wpMatch = wp.match(/^(\d+):/);
      return wpMatch ? wpMatch[1] : wp;
    });
    filteredActions = filteredActions.filter((action) => {
      if (action.work_package_number) {
        return selectedNumbers.includes(String(action.work_package_number));
      } else {
        return selectedNumbers.includes(action.work_package_name);
      }
    });
  }

  filteredActions.forEach((action) => {
    // Filter by chart search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!action.report.toLowerCase().includes(query)) {
        return;
      }
    }
    const currentCount = workstreamCounts.get(action.report) || 0;
    workstreamCounts.set(action.report, currentCount + 1);
  });

  return Array.from(workstreamCounts.entries())
    .map(([workstream, count]) => ({ workstream, count }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

/**
 * Calculate chart data for actions per work package
 * @param actions - Array of actions
 * @param searchQuery - Optional search query to filter work packages
 * @param selectedLead - Optional selected leads to filter by
 * @param selectedWorkstream - Optional selected workstreams to filter by
 * @returns Array of work package chart entries sorted by count descending
 */
export function calculateWorkPackageChartData(
  actions: Actions,
  searchQuery = "",
  selectedLead: string[] = [],
  selectedWorkstream: string[] = [],
): WorkPackageChartEntry[] {
  const workpackageCounts = new Map<string, number>();

  // Filter actions based on other chart selections
  let filteredActions = actions;

  if (selectedLead.length > 0) {
    filteredActions = filteredActions.filter(
      (action) =>
        Array.isArray(action.work_package_leads) &&
        action.work_package_leads.some((lead) =>
          selectedLead.includes(normalizeLeaderName(lead)),
        ),
    );
  }

  if (selectedWorkstream.length > 0) {
    filteredActions = filteredActions.filter((action) =>
      selectedWorkstream.includes(action.report),
    );
  }

  filteredActions.forEach((action) => {
    const wpKey = action.work_package_number
      ? `${action.work_package_number}: ${action.work_package_name}`
      : action.work_package_name;

    // Filter by chart search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!wpKey.toLowerCase().includes(query)) {
        return;
      }
    }
    const currentCount = workpackageCounts.get(wpKey) || 0;
    workpackageCounts.set(wpKey, currentCount + 1);
  });

  return Array.from(workpackageCounts.entries())
    .map(([workpackage, count]) => ({ workpackage, count }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

/**
 * Calculate upcoming milestones chart data
 * Groups actions by their upcoming milestone and counts occurrences
 * @param actions - Array of actions
 * @param searchQuery - Search query to filter milestones
 * @param selectedLead - Selected leads to filter by
 * @param selectedWorkPackage - Selected work packages to filter by
 * @param selectedWorkstream - Selected workstreams to filter by
 * @returns Array of upcoming milestone chart entries sorted by delivery date (earliest first), then by count descending
 */
export function calculateUpcomingMilestonesChartData(
  actions: Actions,
  searchQuery = "",
  selectedLead: string[] = [],
  selectedWorkPackage: string[] = [],
  selectedWorkstream: string[] = [],
): UpcomingMilestoneChartEntry[] {
  const milestoneCounts = new Map<
    string,
    {
      count: number;
      deliveryDate: string | null;
      actionNumber: number | string | null;
      workPackageNumber: number | string | null;
      workPackageName: string | null;
    }
  >();

  // Filter actions based on other chart selections
  let filteredActions = actions;

  // Only include actions that have upcoming milestones
  filteredActions = filteredActions.filter(
    (action) =>
      action.upcoming_milestone && action.upcoming_milestone.trim() !== "",
  );

  if (selectedLead.length > 0) {
    filteredActions = filteredActions.filter(
      (action) =>
        Array.isArray(action.work_package_leads) &&
        action.work_package_leads.some((lead) =>
          selectedLead.includes(normalizeLeaderName(lead)),
        ),
    );
  }

  if (selectedWorkPackage.length > 0) {
    const selectedNumbers = selectedWorkPackage.map((wp) => {
      const wpMatch = wp.match(/^(\d+):/);
      return wpMatch ? wpMatch[1] : wp;
    });

    filteredActions = filteredActions.filter((action) => {
      if (action.work_package_number) {
        return selectedNumbers.includes(String(action.work_package_number));
      } else {
        return selectedNumbers.includes(action.work_package_name);
      }
    });
  }

  if (selectedWorkstream.length > 0) {
    filteredActions = filteredActions.filter((action) =>
      selectedWorkstream.includes(action.report),
    );
  }

  filteredActions.forEach((action) => {
    if (!action.upcoming_milestone || action.upcoming_milestone.trim() === "") {
      return;
    }

    const milestoneText = action.upcoming_milestone.trim();

    // Filter by chart search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!milestoneText.toLowerCase().includes(query)) {
        return;
      }
    }

    const existing = milestoneCounts.get(milestoneText);
    const deliveryDate = action.delivery_date;

    if (existing) {
      // If multiple delivery dates exist, keep the earliest one
      if (
        deliveryDate &&
        (!existing.deliveryDate || deliveryDate < existing.deliveryDate)
      ) {
        milestoneCounts.set(milestoneText, {
          count: existing.count + 1,
          deliveryDate: deliveryDate,
          actionNumber: existing.actionNumber,
          workPackageNumber: existing.workPackageNumber,
          workPackageName: existing.workPackageName,
        });
      } else {
        milestoneCounts.set(milestoneText, {
          count: existing.count + 1,
          deliveryDate: existing.deliveryDate,
          actionNumber: existing.actionNumber,
          workPackageNumber: existing.workPackageNumber,
          workPackageName: existing.workPackageName,
        });
      }
    } else {
      milestoneCounts.set(milestoneText, {
        count: 1,
        deliveryDate: deliveryDate,
        actionNumber: action.action_number ?? null,
        workPackageNumber: action.work_package_number ?? null,
        workPackageName: action.work_package_name ?? null,
      });
    }
  });

  return (
    Array.from(milestoneCounts.entries()).map(([milestone, data]) => ({
      milestone,
      count: data.count,
      deliveryDate: data.deliveryDate,
      actionNumber: data.actionNumber,
      workPackageNumber: data.workPackageNumber,
      workPackageName: data.workPackageName,
    })) as UpcomingMilestoneChartEntry[]
  ).sort((a, b) => {
    // Sort by deliveryDate first (earliest first, nulls last)
    if (a.deliveryDate && b.deliveryDate) {
      const dateComparison = a.deliveryDate.localeCompare(b.deliveryDate);
      if (dateComparison !== 0) return dateComparison;
    } else if (a.deliveryDate && !b.deliveryDate) {
      return -1;
    } else if (!a.deliveryDate && b.deliveryDate) {
      return 1;
    }
    // Then by count descending
    return b.count - a.count;
  });
}

/**
 * Calculate statistics based on filtered data
 * @param actions - Array of all actions
 * @param filteredWorkPackages - Filtered work packages
 * @param filters - Filter state
 * @returns Statistics data
 */
export function calculateStatsData(
  actions: Actions,
  filteredWorkPackages: WorkPackage[],
  filters: FilterState,
): StatsData {
  const uniqueWorkstreams = new Set<string>();
  const uniqueLeadsSet = new Set<string>();

  // Filter actions based on current filters
  let filteredActions = actions;

  // Search filter
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase();
    const queryWords = query.split(/\s+/);
    filteredActions = filteredActions.filter(
      (action) =>
        action.work_package_name.toLowerCase().includes(query) ||
        String(action.work_package_number).includes(query) ||
        (Array.isArray(action.work_package_leads) &&
          action.work_package_leads.some((lead) =>
            normalizeLeaderName(lead).toLowerCase().includes(query),
          )) ||
        action.indicative_activity.toLowerCase().includes(query) ||
        queryWords.some((w) => w === String(action.action_number)),
    );
  }

  // Work Package filter (supports multiple selections)
  if (filters.selectedWorkPackage && filters.selectedWorkPackage.length > 0) {
    const selectedNumbers = filters.selectedWorkPackage.map((wp) => {
      const wpMatch = wp.match(/^(\d+):/);
      return wpMatch ? wpMatch[1] : wp;
    });

    filteredActions = filteredActions.filter((action) => {
      if (action.work_package_number) {
        return selectedNumbers.includes(String(action.work_package_number));
      } else {
        return selectedNumbers.includes(action.work_package_name);
      }
    });
  }

  // WP Families filter
  if (filters.selectedWpFamily) {
    const allowedNumbers = new Set(
      getWpNumbersForFamily(filters.selectedWpFamily, filteredWorkPackages),
    );

    filteredActions = filteredActions.filter((action) =>
      allowedNumbers.has(String(action.work_package_number)),
    );
  }

  // Lead filter (supports multiple selections)
  if (filters.selectedLead && filters.selectedLead.length > 0) {
    filteredActions = filteredActions.filter(
      (action) =>
        Array.isArray(action.work_package_leads) &&
        action.work_package_leads.some((lead) =>
          filters.selectedLead.includes(normalizeLeaderName(lead)),
        ),
    );
  }

  // Workstream filter (supports multiple selections)
  if (filters.selectedWorkstream && filters.selectedWorkstream.length > 0) {
    filteredActions = filteredActions.filter((action) =>
      filters.selectedWorkstream.includes(action.report),
    );
  }

  const uniqueTeamMembersSet = new Set<string>();

  filteredActions.forEach((action) => {
    if (action.report) {
      uniqueWorkstreams.add(action.report);
    }
    if (Array.isArray(action.work_package_leads)) {
      action.work_package_leads.forEach((lead) => {
        const trimmed = lead?.trim();
        if (trimmed && trimmed.length > 0) {
          const normalized = normalizeLeaderName(trimmed);
          uniqueLeadsSet.add(normalized);
        }
      });
    }
    // Count team members (action_entities)
    if (action.action_entities && action.action_entities.trim()) {
      const entities = action.action_entities
        .split(";")
        .map((e) => e.trim())
        .filter(Boolean);
      entities.forEach((entity) => {
        const normalized = normalizeTeamMember(entity);
        if (normalized) {
          uniqueTeamMembersSet.add(normalized);
        }
      });
    }
  });

  // Count actions: exclude only subaction entries (is_subaction and sub_action_details);
  // main actions with sub_action_details are counted to match total (86).
  const nonSubactionCount = filteredActions.filter(
    (action) => !(action.sub_action_details && action.is_subaction),
  ).length;

  return {
    workstreams: uniqueWorkstreams.size,
    workpackages: filteredWorkPackages.length,
    actions: nonSubactionCount,
    leads: uniqueLeadsSet.size,
    teamMembers: uniqueTeamMembersSet.size,
  };
}
