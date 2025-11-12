import { useMemo } from "react";
import type { Actions, FilterState } from "@/types";
import { groupActionsByWorkPackage } from "@/lib/workPackages";
import {
    filterWorkPackages,
    getUniqueWorkPackages,
    getUniqueLeads,
    getUniqueWorkstreams,
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
    workpackageChartSearchQuery: string
) {
    // Group actions by work package (combine across reports)
    const workPackages = useMemo(() => groupActionsByWorkPackage(actions), [actions]);

    // Helper function to filter work packages based on selected filters (excluding the filter being computed)
    const getFilteredWorkPackagesForOptions = useMemo(() => {
        let filtered = workPackages;

        // Apply lead filter (if selected) when computing work packages and workstreams
        if (filters.selectedLead) {
            filtered = filtered.filter((wp) => wp.leads.includes(filters.selectedLead));
        }

        // Apply workstream filter (if selected) when computing work packages and leads
        if (filters.selectedWorkstream) {
            filtered = filtered.filter((wp) => wp.report.includes(filters.selectedWorkstream));
        }

        // NOTE: Do NOT filter by selectedWorkPackage here for multi-select
        // We want to show all available work packages in the dropdown

        return filtered;
    }, [workPackages, filters.selectedLead, filters.selectedWorkstream]);

    // Get unique values for filters (filtered based on other selections)
    const uniqueWorkPackages = useMemo(
        () => getUniqueWorkPackages(getFilteredWorkPackagesForOptions),
        [getFilteredWorkPackagesForOptions]
    );

    const uniqueLeads = useMemo(
        () => getUniqueLeads(getFilteredWorkPackagesForOptions),
        [getFilteredWorkPackagesForOptions]
    );

    const uniqueWorkstreams = useMemo(
        () => getUniqueWorkstreams(getFilteredWorkPackagesForOptions),
        [getFilteredWorkPackagesForOptions]
    );

    // Calculate chart data: count work packages per lead
    const chartData = useMemo(
        () => calculateLeadChartData(workPackages, chartSearchQuery),
        [workPackages, chartSearchQuery]
    );

    // Calculate chart data: count actions per workstream
    const workstreamChartData = useMemo(
        () => calculateWorkstreamChartData(actions, workstreamChartSearchQuery),
        [actions, workstreamChartSearchQuery]
    );

    // Calculate chart data: count actions per work package
    const workpackageChartData = useMemo(
        () => calculateWorkPackageChartData(actions, workpackageChartSearchQuery),
        [actions, workpackageChartSearchQuery]
    );

    // Filter work packages based on search and filters
    const filteredWorkPackages = useMemo(
        () => filterWorkPackages(workPackages, filters),
        [workPackages, filters]
    );

    // Calculate statistics based on filtered data
    const statsData = useMemo(
        () => calculateStatsData(actions, filteredWorkPackages, filters),
        [actions, filteredWorkPackages, filters]
    );

    return {
        workPackages,
        filteredWorkPackages,
        uniqueWorkPackages,
        uniqueLeads,
        uniqueWorkstreams,
        chartData,
        workstreamChartData,
        workpackageChartData,
        statsData,
    };
}
