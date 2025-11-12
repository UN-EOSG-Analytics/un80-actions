import type { 
    Actions, 
    WorkPackage, 
    LeadChartEntry, 
    WorkstreamChartEntry, 
    WorkPackageChartEntry,
    StatsData,
    FilterState
} from "@/types";

/**
 * Filter work packages based on filter state
 * @param workPackages - Array of work packages to filter
 * @param filters - Filter state
 * @returns Filtered work packages
 */
export function filterWorkPackages(
    workPackages: WorkPackage[],
    filters: FilterState
): WorkPackage[] {
    let filtered = workPackages;

    // Search filter
    if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
            (wp) =>
                wp.name.toLowerCase().includes(query) ||
                wp.number.includes(query) ||
                wp.leads.some((lead) => lead.toLowerCase().includes(query)) ||
                wp.actions.some((action) => action.text.toLowerCase().includes(query))
        );
    }

    // Work Package filter
    if (filters.selectedWorkPackage) {
        const wpMatch = filters.selectedWorkPackage.match(/^(\d+):/);
        if (wpMatch) {
            const wpNumber = wpMatch[1];
            filtered = filtered.filter((wp) => wp.number === wpNumber);
        } else {
            // Handle work packages without numbers
            filtered = filtered.filter((wp) => !wp.number && wp.name === filters.selectedWorkPackage);
        }
    }

    // Lead filter
    if (filters.selectedLead) {
        filtered = filtered.filter((wp) => wp.leads.includes(filters.selectedLead));
    }

    // Workstream filter
    if (filters.selectedWorkstream) {
        filtered = filtered.filter((wp) => wp.report.includes(filters.selectedWorkstream));
    }

    // Big Ticket filter
    if (filters.selectedBigTicket === "big-ticket") {
        filtered = filtered.filter((wp) => wp.bigTicket === true);
    } else if (filters.selectedBigTicket === "other") {
        filtered = filtered.filter((wp) => wp.bigTicket === false);
    }

    // Sort filtered work packages
    if (filters.sortOption) {
        filtered = [...filtered].sort((a, b) => {
            switch (filters.sortOption) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "number-asc": {
                    const numA = parseInt(a.number) || 0;
                    const numB = parseInt(b.number) || 0;
                    if (numA !== numB) return numA - numB;
                    return a.name.localeCompare(b.name);
                }
                case "number-desc": {
                    const numA = parseInt(a.number) || 0;
                    const numB = parseInt(b.number) || 0;
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
    return Array.from(new Set(workPackages.map(wp =>
        wp.number ? `${wp.number}: ${wp.name}` : wp.name
    ))).sort();
}

/**
 * Get unique leads for filter options
 * @param workPackages - Array of work packages
 * @returns Sorted array of unique leads
 */
export function getUniqueLeads(workPackages: WorkPackage[]): string[] {
    const leads = new Set<string>();
    workPackages.forEach(wp => {
        wp.leads.forEach(lead => leads.add(lead));
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
    workPackages.forEach(wp => {
        wp.report.forEach(ws => workstreams.add(ws));
    });
    return Array.from(workstreams).sort();
}

/**
 * Calculate chart data for work packages per lead
 * @param workPackages - Array of work packages
 * @param searchQuery - Optional search query to filter leads
 * @returns Array of lead chart entries sorted by count descending
 */
export function calculateLeadChartData(
    workPackages: WorkPackage[],
    searchQuery = ""
): LeadChartEntry[] {
    const leadCounts = new Map<string, number>();

    workPackages.forEach(wp => {
        wp.leads.forEach(lead => {
            // Filter by chart search query if provided
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                if (!lead.toLowerCase().includes(query)) {
                    return;
                }
            }
            const currentCount = leadCounts.get(lead) || 0;
            leadCounts.set(lead, currentCount + 1);
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
 * @returns Array of workstream chart entries sorted by workstream order
 */
export function calculateWorkstreamChartData(
    actions: Actions,
    searchQuery = ""
): WorkstreamChartEntry[] {
    const workstreamCounts = new Map<string, number>();

    actions.forEach(action => {
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
        .sort((a, b) => {
            // Sort WS1, WS2, WS3
            const order = ['WS1', 'WS2', 'WS3'];
            const aIndex = order.indexOf(a.workstream);
            const bIndex = order.indexOf(b.workstream);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.workstream.localeCompare(b.workstream);
        });
}

/**
 * Calculate chart data for actions per work package
 * @param actions - Array of actions
 * @param searchQuery - Optional search query to filter work packages
 * @returns Array of work package chart entries sorted by number
 */
export function calculateWorkPackageChartData(
    actions: Actions,
    searchQuery = ""
): WorkPackageChartEntry[] {
    const workpackageCounts = new Map<string, number>();

    actions.forEach(action => {
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
        .sort((a, b) => {
            // Sort by workpackage number if available
            const aMatch = a.workpackage.match(/^(\d+):/);
            const bMatch = b.workpackage.match(/^(\d+):/);
            if (aMatch && bMatch) {
                return parseInt(aMatch[1]) - parseInt(bMatch[1]);
            }
            if (aMatch) return -1;
            if (bMatch) return 1;
            return a.workpackage.localeCompare(b.workpackage);
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
    filters: FilterState
): StatsData {
    const uniqueWorkstreams = new Set<string>();
    const uniqueLeadsSet = new Set<string>();

    // Filter actions based on current filters
    let filteredActions = actions;

    // Search filter
    if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        filteredActions = filteredActions.filter(
            (action) =>
                action.work_package_name.toLowerCase().includes(query) ||
                action.work_package_number.includes(query) ||
                (Array.isArray(action.work_package_leads) && 
                 action.work_package_leads.some((lead) => lead.toLowerCase().includes(query))) ||
                action.indicative_activity.toLowerCase().includes(query)
        );
    }

    // Work Package filter
    if (filters.selectedWorkPackage) {
        const wpMatch = filters.selectedWorkPackage.match(/^(\d+):/);
        if (wpMatch) {
            const wpNumber = wpMatch[1];
            filteredActions = filteredActions.filter((action) => action.work_package_number === wpNumber);
        } else {
            filteredActions = filteredActions.filter(
                (action) => !action.work_package_number && action.work_package_name === filters.selectedWorkPackage
            );
        }
    }

    // Lead filter
    if (filters.selectedLead) {
        filteredActions = filteredActions.filter((action) =>
            Array.isArray(action.work_package_leads) && action.work_package_leads.includes(filters.selectedLead)
        );
    }

    // Workstream filter
    if (filters.selectedWorkstream) {
        filteredActions = filteredActions.filter((action) => action.report === filters.selectedWorkstream);
    }

    filteredActions.forEach(action => {
        if (action.report) {
            uniqueWorkstreams.add(action.report);
        }
        if (Array.isArray(action.work_package_leads)) {
            action.work_package_leads.forEach(lead => {
                const trimmed = lead?.trim();
                if (trimmed && trimmed.length > 0) {
                    uniqueLeadsSet.add(trimmed);
                }
            });
        }
    });

    return {
        workstreams: uniqueWorkstreams.size,
        workpackages: filteredWorkPackages.length,
        actions: filteredActions.length,
        leads: uniqueLeadsSet.size,
    };
}
