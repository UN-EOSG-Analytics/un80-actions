import { useState, useEffect } from "react";
import type { Actions, WorkPackageStats, NextMilestone } from "@/types";
import { fetchActions } from "@/lib/actions";
import {
  calculateStats,
  calculateNextMilestone,
  calculateProgressPercentage,
} from "@/lib/workPackages";

/**
 * Custom hook to manage actions data and related statistics
 * @returns Object containing actions, loading state, stats, next milestone, and progress
 */
export function useActions() {
  const [actions, setActions] = useState<Actions>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<WorkPackageStats>({
    total: 0,
    completed: 0,
    totalActions: 0,
    completedActions: 0,
  });
  const [nextMilestone, setNextMilestone] = useState<NextMilestone | null>(
    null,
  );
  const [progressPercentage, setProgressPercentage] = useState<number>(0);

  useEffect(() => {
    fetchActions()
      .then((data) => {
        setActions(data);
        setStats(calculateStats(data));
        setNextMilestone(calculateNextMilestone(data));
        setProgressPercentage(calculateProgressPercentage());
      })
      .catch((error) => {
        console.error("Failed to fetch actions:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return {
    actions,
    isLoading,
    stats,
    nextMilestone,
    progressPercentage,
  };
}
