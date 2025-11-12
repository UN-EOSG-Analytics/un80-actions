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
        // NOTE: Do NOT filter by selectedLead, selectedWorkstream, or selectedWorkPackage 
        // here for multi-select. We want to show all available options in the dropdowns.
        return workPackages;
    }, [workPackages]);

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
    // Filter by selected workstream and workpackage from other charts
    const chartData = useMemo(
        () => calculateLeadChartData(
            workPackages, 
            chartSearchQuery,
            filters.selectedWorkstream,
            filters.selectedWorkPackage
        ),
        [workPackages, chartSearchQuery, filters.selectedWorkstream, filters.selectedWorkPackage]
    );

    // Calculate chart data: count actions per workstream
    // Filter by selected lead and workpackage from other charts
    const workstreamChartData = useMemo(
        () => calculateWorkstreamChartData(
            actions, 
            workstreamChartSearchQuery,
            filters.selectedLead,
            filters.selectedWorkPackage
        ),
        [actions, workstreamChartSearchQuery, filters.selectedLead, filters.selectedWorkPackage]
    );

    // Calculate chart data: count actions per work package
    // Filter by selected lead and workstream from other charts
    const workpackageChartData = useMemo(
        () => calculateWorkPackageChartData(
            actions, 
            workpackageChartSearchQuery,
            filters.selectedLead,
            filters.selectedWorkstream
        ),
        [actions, workpackageChartSearchQuery, filters.selectedLead, filters.selectedWorkstream]
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
