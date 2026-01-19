import type { Actions } from "@/types";
import { normalizeLeaderName } from "./utils";

/**
 * Progress metrics for UN leaders submissions
 */
export interface LeaderSubmissionProgress {
  totalLeaders: number;
  milestonesSubmitted: number;
  dueDatesSubmitted: number;
  focalPointsSubmitted: number;
}

/**
 * Calculate submission progress for UN leaders
 * @param actions - Array of actions
 * @returns Progress metrics
 */
export function calculateLeaderSubmissionProgress(
  actions: Actions,
): LeaderSubmissionProgress {
  // Get all unique leaders
  const allLeaders = new Set<string>();
  actions.forEach((action) => {
    if (action.work_package_leads && Array.isArray(action.work_package_leads)) {
      action.work_package_leads.forEach((lead) => {
        if (lead && lead.trim()) {
          const normalized = normalizeLeaderName(lead.trim());
          allLeaders.add(normalized);
        }
      });
    }
  });

  const totalLeaders = allLeaders.size;

  // Leaders who have submitted focal points
  const leadersWithFocalPointsSet = new Set([
    "DSG",
    "ED UNITAR",
    "ED UN Women",
    "ED UNOPS",
    "ES ECA",
    "ES UNFCCC",
    "HC OHCHR",
    "SG ITU",
    "USG DGACM",
    "USG DMSPC",
    "USG DOS",
    "USG DPO",
    "USG DPPA",
    "USG OCT",
    "USG ODA",
    "USG Policy",
  ]);

  // Track which leaders have submitted each type of data
  const leadersWithFocalPoints = new Set<string>();

  // Group actions by work package to check due dates
  const workPackagesByLeader = new Map<string, Set<string>>();

  actions.forEach((action) => {
    if (
      !action.work_package_leads ||
      !Array.isArray(action.work_package_leads)
    ) {
      return;
    }

    const workPackageKey = `${action.report}-${action.work_package_number}`;

    action.work_package_leads.forEach((lead) => {
      if (!lead || !lead.trim()) return;

      const normalizedLead = normalizeLeaderName(lead.trim());

      // Track focal points: only specific leaders have submitted focal points
      if (leadersWithFocalPointsSet.has(normalizedLead)) {
        leadersWithFocalPoints.add(normalizedLead);
      }

      // Track work packages per leader for due date calculation
      if (!workPackagesByLeader.has(normalizedLead)) {
        workPackagesByLeader.set(normalizedLead, new Set());
      }
      workPackagesByLeader.get(normalizedLead)!.add(workPackageKey);
    });
  });

  // Count focal points: only the specified leaders have submitted focal points
  const focalPointsCount = Array.from(allLeaders).filter((leader) =>
    leadersWithFocalPointsSet.has(leader),
  ).length;

  return {
    totalLeaders,
    milestonesSubmitted: 0, // No one has submitted milestones
    dueDatesSubmitted: 0, // No one has submitted due dates
    focalPointsSubmitted: focalPointsCount,
  };
}

/**
 * Leader submission status for checklist display
 */
export interface LeaderSubmissionStatus {
  leader: string;
  hasFocalPoints: boolean;
  hasMilestone: boolean;
  hasDueDate: boolean;
}

/**
 * Get detailed submission status for each leader
 * @param actions - Array of actions
 * @returns Array of leader submission statuses
 */
export function getLeaderSubmissionStatuses(
  actions: Actions,
): LeaderSubmissionStatus[] {
  // Get all unique leaders
  const allLeaders = new Set<string>();
  actions.forEach((action) => {
    if (action.work_package_leads && Array.isArray(action.work_package_leads)) {
      action.work_package_leads.forEach((lead) => {
        if (lead && lead.trim()) {
          const normalized = normalizeLeaderName(lead.trim());
          allLeaders.add(normalized);
        }
      });
    }
  });

  // Leaders who have submitted focal points
  const leadersWithFocalPointsSet = new Set([
    "DSG",
    "ED UNITAR",
    "ED UN Women",
    "ED UNOPS",
    "ES ECA",
    "ES UNFCCC",
    "HC OHCHR",
    "SG ITU",
    "USG DGACM",
    "USG DMSPC",
    "USG DOS",
    "USG DPO",
    "USG DPPA",
    "USG OCT",
    "USG ODA",
    "USG Policy",
  ]);

  // Track which leaders have submitted each type of data
  const leadersWithFocalPoints = new Set<string>();

  // Group actions by work package to check due dates
  const workPackagesByLeader = new Map<string, Set<string>>();

  actions.forEach((action) => {
    if (
      !action.work_package_leads ||
      !Array.isArray(action.work_package_leads)
    ) {
      return;
    }

    const workPackageKey = `${action.report}-${action.work_package_number}`;

    action.work_package_leads.forEach((lead) => {
      if (!lead || !lead.trim()) return;

      const normalizedLead = normalizeLeaderName(lead.trim());

      // Track focal points: only specific leaders have submitted focal points
      if (leadersWithFocalPointsSet.has(normalizedLead)) {
        leadersWithFocalPoints.add(normalizedLead);
      }

      // Track work packages per leader for due date calculation
      if (!workPackagesByLeader.has(normalizedLead)) {
        workPackagesByLeader.set(normalizedLead, new Set());
      }
      workPackagesByLeader.get(normalizedLead)!.add(workPackageKey);
    });
  });

  // Create status array for all leaders
  return Array.from(allLeaders)
    .sort()
    .map((leader) => ({
      leader,
      hasFocalPoints: leadersWithFocalPoints.has(leader),
      hasMilestone: false, // No one has submitted milestones
      hasDueDate: false, // No one has submitted due dates
    }));
}
