import type { Actions, WorkPackageStats, NextMilestone } from "@/types";
import { getActions } from "@/lib/actions";
import {
  calculateStats,
  calculateNextMilestone,
  calculateProgressPercentage,
} from "@/lib/workPackages";

// Data is bundled at build time - compute once on module load
const actions: Actions = getActions();
const stats: WorkPackageStats = calculateStats(actions);
const nextMilestone: NextMilestone | null = calculateNextMilestone(actions);
const progressPercentage: number = calculateProgressPercentage();

/**
 * Hook to access actions data and related statistics
 * Data is bundled at build time for instant availability (no loading state)
 * @returns Object containing actions, stats, next milestone, and progress
 */
export function useActions() {
  return {
    actions,
    stats,
    nextMilestone,
    progressPercentage,
  };
}
