import { useMemo } from "react";
import type { Actions, FilterState } from "@/types";
import { groupActionsByWorkPackage } from "@/lib/workPackages";
import {
  filterWorkPackages,
  getUniqueWorkPackages,
  getUniqueLeads,
  getUniqueWorkstreams,
  getUniqueActions,
  calculateLeadChartData,
  calculateWorkstreamChartData,
  calculateWorkPackageChartData,
  calculateStatsData,
} from "@/lib/filters";

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
) {
  // Group actions by work package (combine across reports)
  const workPackages = useMemo(
    () => groupActionsByWorkPackage(actions),
    [actions],
  );

  // Helper function to filter work packages with all filters except one
  const getFilteredWorkPackagesExcludingFilter = (
    excludeFilter: "lead" | "workstream" | "workpackage" | "action",
  ) => {
    let filtered = workPackages;

    // Always apply search query and big ticket filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (wp) =>
          wp.name.toLowerCase().includes(query) ||
          wp.number.includes(query) ||
          wp.leads.some((lead) => lead.toLowerCase().includes(query)) ||
          wp.actions.some((action) => action.text.toLowerCase().includes(query)),
      );
    }

    if (filters.selectedBigTicket && filters.selectedBigTicket.length > 0) {
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
    if (excludeFilter !== "lead" && filters.selectedLead && filters.selectedLead.length > 0) {
      filtered = filtered.filter((wp) =>
        wp.leads.some((lead) => filters.selectedLead!.includes(lead)),
      );
    }

    if (excludeFilter !== "workstream" && filters.selectedWorkstream && filters.selectedWorkstream.length > 0) {
      filtered = filtered.filter((wp) =>
        filters.selectedWorkstream!.some((ws) => wp.report.includes(ws)),
      );
    }

    if (excludeFilter !== "workpackage" && filters.selectedWorkPackage && filters.selectedWorkPackage.length > 0) {
      const selectedNumbers = filters.selectedWorkPackage.map((wp) => {
        const wpMatch = wp.match(/^(\d+):/);
        return wpMatch ? wpMatch[1] : wp;
      });

      filtered = filtered.filter((wp) => {
        if (wp.number) {
          return selectedNumbers.includes(wp.number);
        } else {
          return selectedNumbers.includes(wp.name);
        }
      });
    }

    if (excludeFilter !== "action" && filters.selectedAction && filters.selectedAction.length > 0) {
      filtered = filtered.filter((wp) =>
        wp.actions.some((action) =>
          filters.selectedAction!.includes(action.text.trim()),
        ),
      );
    }

    return filtered;
  };

  // Get unique values for filters (filtered based on other selections)
  const uniqueWorkPackages = useMemo(
    () => getUniqueWorkPackages(getFilteredWorkPackagesExcludingFilter("workpackage")),
    [workPackages, filters],
  );

  const uniqueLeads = useMemo(
    () => getUniqueLeads(getFilteredWorkPackagesExcludingFilter("lead")),
    [workPackages, filters],
  );

  const uniqueWorkstreams = useMemo(
    () => getUniqueWorkstreams(getFilteredWorkPackagesExcludingFilter("workstream")),
    [workPackages, filters],
  );

  const uniqueActions = useMemo(
    () => getUniqueActions(getFilteredWorkPackagesExcludingFilter("action")),
    [workPackages, filters],
  );

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
    chartData,
    workstreamChartData,
    workpackageChartData,
    statsData,
  };
}
