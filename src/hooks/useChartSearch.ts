import { useState } from "react";
import type { ChartSearchState } from "@/types";

/**
 * Custom hook to manage chart search queries
 * @returns Object containing chart search state and setters
 */
export function useChartSearch() {
  const [chartSearchQuery, setChartSearchQuery] = useState<string>("");
  const [workstreamChartSearchQuery, setWorkstreamChartSearchQuery] =
    useState<string>("");
  const [workpackageChartSearchQuery, setWorkpackageChartSearchQuery] =
    useState<string>("");
  const [
    upcomingMilestonesChartSearchQuery,
    setUpcomingMilestonesChartSearchQuery,
  ] = useState<string>("");
  const [milestonesPerMonthSearchQuery, setMilestonesPerMonthSearchQuery] =
    useState<string>("");
  const [leaderChecklistSearchQuery, setLeaderChecklistSearchQuery] =
    useState<string>("");

  const chartSearch: ChartSearchState = {
    chartSearchQuery,
    workstreamChartSearchQuery,
    workpackageChartSearchQuery,
    upcomingMilestonesChartSearchQuery,
  };

  return {
    chartSearch,
    chartSearchQuery,
    setChartSearchQuery,
    workstreamChartSearchQuery,
    setWorkstreamChartSearchQuery,
    workpackageChartSearchQuery,
    setWorkpackageChartSearchQuery,
    upcomingMilestonesChartSearchQuery,
    setUpcomingMilestonesChartSearchQuery,
    milestonesPerMonthSearchQuery,
    setMilestonesPerMonthSearchQuery,
    leaderChecklistSearchQuery,
    setLeaderChecklistSearchQuery,
  };
}
