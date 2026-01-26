import { useMemo, useCallback } from "react";
import type { Actions, FilterState } from "@/types";
import { groupActionsByWorkPackage } from "@/lib/workPackages";
import {
  filterWorkPackages,
  getUniqueWorkPackages,
  getUniqueLeads,
  getUniqueWorkstreams,
  getUniqueActions,
  getUniqueTeamMembers,
  calculateLeadChartData,
  calculateWorkstreamChartData,
  calculateWorkPackageChartData,
  calculateUpcomingMilestonesChartData,
  calculateStatsData,
} from "@/lib/filters";
import { normalizeTeamMember } from "@/lib/utils";

// Local WP Families mapping (by work package number) for option computations
const WP_FAMILY_2 = ["3", "4", "5", "6", "12"];
const WP_FAMILY_3 = ["14", "18", "15", "2"];
const WP_FAMILY_4 = ["2", "16", "17", "7", "8"];

function getWpNumbersForFamilyForHook(
  familyKey: string,
  workPackages: ReturnType<typeof groupActionsByWorkPackage>,
): string[] {
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
 * Custom hook to compute work packages and all derived data
 * @param actions - Array of actions
 * @param filters - Filter state
 * @param chartSearchQuery - Search query for lead chart
 * @param workstreamChartSearchQuery - Search query for workstream chart
 * @param workpackageChartSearchQuery - Search query for work package chart
 * @returns Object containing all computed data
 */
export function useWorkPackageData(
  actions: Actions,
  filters: FilterState,
  chartSearchQuery: string,
  workstreamChartSearchQuery: string,
  workpackageChartSearchQuery: string,
  upcomingMilestonesChartSearchQuery: string,
) {
  // Group actions by work package (combine across reports)
  const workPackages = useMemo(
    () => groupActionsByWorkPackage(actions),
    [actions],
  );

  // Helper function to filter actions within work packages by team members
  const filterActionsByTeamMembers = useCallback(
    (wp: (typeof workPackages)[0]): (typeof workPackages)[0] => {
      if (filters.selectedTeamMember && filters.selectedTeamMember.length > 0) {
        const filteredActions = wp.actions.filter((action) => {
          if (!action.actionEntities) return false;
          const entities = action.actionEntities
            .split(";")
            .map((e) => e.trim())
            .filter(Boolean);
          // Normalize both the selected team members and the entities for comparison
          const normalizedSelected = filters
            .selectedTeamMember!.map(normalizeTeamMember)
            .filter(Boolean) as string[];
          return entities.some((entity) => {
            const normalizedEntity = normalizeTeamMember(entity);
            return (
              normalizedEntity && normalizedSelected.includes(normalizedEntity)
            );
          });
        });
        return {
          ...wp,
          actions: filteredActions,
        };
      }
      return wp;
    },
    [filters.selectedTeamMember],
  );

  // Helper function to filter work packages with all filters except one
  const getFilteredWorkPackagesExcludingFilter = useCallback(
    (
      excludeFilter:
        | "lead"
        | "workstream"
        | "workpackage"
        | "action"
        | "bigticket"
        | "wpfamily"
        | "teammember",
    ) => {
      let filtered = workPackages;

      // Always apply search query
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

      // Apply team member filter at action level (unless it's the excluded filter)
      // This filters actions within work packages, not the work packages themselves
      if (
        excludeFilter !== "teammember" &&
        filters.selectedTeamMember &&
        filters.selectedTeamMember.length > 0
      ) {
        filtered = filtered
          .map(filterActionsByTeamMembers)
          .filter((wp) => wp.actions.length > 0);
      }

      // Apply big ticket filter unless it's the excluded filter
      if (
        excludeFilter !== "bigticket" &&
        filters.selectedBigTicket &&
        filters.selectedBigTicket.length > 0
      ) {
        const hasBigTicket = filters.selectedBigTicket.includes("big-ticket");
        const hasOther = filters.selectedBigTicket.includes("other");

        if (hasBigTicket && hasOther) {
          // Both selected, show all
        } else if (hasBigTicket) {
          filtered = filtered.filter((wp) => wp.bigTicket === true);
        } else if (hasOther) {
          filtered = filtered.filter((wp) => wp.bigTicket === false);
        }
      }

      // Apply filters based on what's not excluded
      if (
        excludeFilter !== "lead" &&
        filters.selectedLead &&
        filters.selectedLead.length > 0
      ) {
        filtered = filtered.filter((wp) =>
          wp.leads.some((lead) => filters.selectedLead!.includes(lead)),
        );
      }

      if (
        excludeFilter !== "workstream" &&
        filters.selectedWorkstream &&
        filters.selectedWorkstream.length > 0
      ) {
        filtered = filtered.filter((wp) =>
          filters.selectedWorkstream!.some((ws) => wp.report.includes(ws)),
        );
      }

      if (
        excludeFilter !== "workpackage" &&
        filters.selectedWorkPackage &&
        filters.selectedWorkPackage.length > 0
      ) {
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

      if (
        excludeFilter !== "action" &&
        filters.selectedAction &&
        filters.selectedAction.length > 0
      ) {
        filtered = filtered.filter((wp) =>
          wp.actions.some((action) => {
            const actionNumber = String(action.actionNumber || "");
            const match = filters.selectedAction!.some((selected) => {
              const selectedTrimmed = selected.trim();
              const result = actionNumber === selectedTrimmed;
              return result;
            });
            return match;
          }),
        );
      }

      // Apply WP Families filter unless it's the excluded filter
      if (excludeFilter !== "wpfamily" && filters.selectedWpFamily) {
        const allowedNumbers = new Set(
          getWpNumbersForFamilyForHook(filters.selectedWpFamily, workPackages),
        );

        filtered = filtered.filter((wp) => {
          if (typeof wp.number === "number") {
            return allowedNumbers.has(String(wp.number));
          }
          return false;
        });
      }

      return filtered;
    },
    [workPackages, filters, filterActionsByTeamMembers],
  );

  // Get unique values for filters (filtered based on other selections)
  const uniqueWorkPackages = useMemo(
    () =>
      getUniqueWorkPackages(
        getFilteredWorkPackagesExcludingFilter("workpackage"),
      ),
    [getFilteredWorkPackagesExcludingFilter],
  );

  const uniqueLeads = useMemo(
    () => getUniqueLeads(getFilteredWorkPackagesExcludingFilter("lead")),
    [getFilteredWorkPackagesExcludingFilter],
  );

  const uniqueWorkstreams = useMemo(
    () =>
      getUniqueWorkstreams(
        getFilteredWorkPackagesExcludingFilter("workstream"),
      ),
    [getFilteredWorkPackagesExcludingFilter],
  );

  const uniqueActions = useMemo(
    () => getUniqueActions(getFilteredWorkPackagesExcludingFilter("action")),
    [getFilteredWorkPackagesExcludingFilter],
  );

  // Extract just the text for backward compatibility with filter matching
  const uniqueActionTexts = useMemo(
    () => uniqueActions.map((a) => a.text),
    [uniqueActions],
  );

  const uniqueTeamMembers = useMemo(
    () =>
      getUniqueTeamMembers(
        getFilteredWorkPackagesExcludingFilter("teammember"),
      ),
    [getFilteredWorkPackagesExcludingFilter],
  );

  // Get available big ticket filter options based on current filters
  const availableBigTicketOptions = useMemo(() => {
    const filtered = getFilteredWorkPackagesExcludingFilter("bigticket");
    const hasBigTicket = filtered.some((wp) => wp.bigTicket === true);
    const hasOther = filtered.some((wp) => wp.bigTicket === false);

    const options = [];
    if (hasBigTicket) {
      options.push({ key: "big-ticket", label: '"Big Ticket" Work packages' });
    }
    if (hasOther) {
      options.push({ key: "other", label: "Other Work packages" });
    }
    return options;
  }, [getFilteredWorkPackagesExcludingFilter]);

  // Calculate chart data: count work packages per lead
  // Filter by selected workstream and workpackage from other charts
  const chartData = useMemo(
    () =>
      calculateLeadChartData(
        workPackages,
        chartSearchQuery,
        filters.selectedWorkstream,
        filters.selectedWorkPackage,
      ),
    [
      workPackages,
      chartSearchQuery,
      filters.selectedWorkstream,
      filters.selectedWorkPackage,
    ],
  );

  // Calculate chart data: count actions per workstream
  // Filter by selected lead and workpackage from other charts
  const workstreamChartData = useMemo(
    () =>
      calculateWorkstreamChartData(
        actions,
        workstreamChartSearchQuery,
        filters.selectedLead,
        filters.selectedWorkPackage,
      ),
    [
      actions,
      workstreamChartSearchQuery,
      filters.selectedLead,
      filters.selectedWorkPackage,
    ],
  );

  // Calculate chart data: count actions per work package
  // Filter by selected lead and workstream from other charts
  const workpackageChartData = useMemo(
    () =>
      calculateWorkPackageChartData(
        actions,
        workpackageChartSearchQuery,
        filters.selectedLead,
        filters.selectedWorkstream,
      ),
    [
      actions,
      workpackageChartSearchQuery,
      filters.selectedLead,
      filters.selectedWorkstream,
    ],
  );

  // Calculate chart data: upcoming milestones
  // Filter by selected lead, work package, and workstream from other charts
  const upcomingMilestonesChartData = useMemo(
    () =>
      calculateUpcomingMilestonesChartData(
        actions,
        upcomingMilestonesChartSearchQuery,
        filters.selectedLead,
        filters.selectedWorkPackage,
        filters.selectedWorkstream,
      ),
    [
      actions,
      upcomingMilestonesChartSearchQuery,
      filters.selectedLead,
      filters.selectedWorkPackage,
      filters.selectedWorkstream,
    ],
  );

  // Filter work packages based on search and filters
  const filteredWorkPackages = useMemo(
    () => filterWorkPackages(workPackages, filters),
    [workPackages, filters],
  );

  // Calculate statistics based on filtered data
  const statsData = useMemo(
    () => calculateStatsData(actions, filteredWorkPackages, filters),
    [actions, filteredWorkPackages, filters],
  );

  return {
    workPackages,
    filteredWorkPackages,
    uniqueWorkPackages,
    uniqueLeads,
    uniqueWorkstreams,
    uniqueActions,
    uniqueActionTexts,
    uniqueTeamMembers,
    availableBigTicketOptions,
    chartData,
    workstreamChartData,
    workpackageChartData,
    upcomingMilestonesChartData,
    statsData,
  };
}
