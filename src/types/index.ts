/**
 * Type definitions for UN80 Actions Dashboard
 * Centralized type exports for the entire application
 */

// ============================================================================
// Action Types
// ============================================================================

/**
 * Represents a UN action item with its associated metadata
 */
export interface Action {
  /** Report identifier (e.g., "WS2", "WS3") */
  report: string;

  /** Work package number as a string */
  work_package_number: number;

  /** Name/title of the work package */
  work_package_name: string;

  /** Paragraph number in the document */
  document_paragraph: string | null;

  /** Unique action number as a string */
  action_number: number;

  /** Description of the indicative activity */
  indicative_activity: string;

  /** Whether this is a "big ticket" item */
  big_ticket: boolean;

  /** Array of work package leads */
  work_package_leads: string[];

  /** First milestone description or null */
  first_milestone: string | null;

  /** First milestone deadline date in ISO format (e.g., "2026-02-28") or null */
  first_milestone_deadline: string | null;

  /** Final milestone description or null */
  final_milestone: string | null;

  /** Final milestone deadline date in ISO format (e.g., "2026-02-28") or null */
  final_milestone_deadline: string | null;

  /** Action entities (team members) separated by semicolons or null */
  action_entities: string | null;

  /** Whether this is a subaction (not displayed on dashboard) */
  is_subaction?: boolean;

  /** Work package goal description or null */
  work_package_goal: string | null;

  /** Document text or null */
  doc_text: string | null;

  /** Upcoming milestone description or null */
  upcoming_milestone: string | null;

  /** Upcoming milestone deadline date in ISO format (e.g., "2026-02-28") or null */
  upcoming_milestone_deadline: string | null;

  /** Updates text or null */
  updates: string | null;

  /** Link to updates document or null */
  link_updates: string | null;

  /** Delivery date in ISO format (e.g., "2026-02-28") or null */
  delivery_date: string | null;

  /** Scenario status */
  scenario: string | null;

  /** Action status - "Further Work Ongoing" or "Decision Taken" */
  action_status: "Further Work Ongoing" | "Decision Taken" | null;

  /** Sub-action details description or null (for subactions) */
  sub_action_details: string | null;

  /** Action leads array */
  action_leads: string[];
}

/**
 * Array of Action items
 */
export type Actions = Action[];

// ============================================================================
// Work Package Types
// ============================================================================

/**
 * Work package statistics interface
 */
export interface WorkPackageStats {
  total: number;
  completed: number;
  totalActions: number;
  completedActions: number;
}

/**
 * Next milestone interface
 */
export interface NextMilestone {
  date: string;
  indicativeActivity: string;
}

/**
 * Represents an individual action within a work package
 */
export interface WorkPackageAction {
  text: string;
  documentParagraph: string;
  leads: string[];
  report: string;
  docText: string | null;
  actionNumber: number;
  firstMilestone: string | null;
  finalMilestoneDeadline: string | null;
  actionEntities: string | null;
  subActionDetails: string | null;
  actionStatus: "Further Work Ongoing" | "Decision Taken";
}

/**
 * Represents a grouped work package with aggregated data across reports
 */
export interface WorkPackage {
  report: string[];
  number: number | "";
  name: string;
  leads: string[];
  goal: string | null;
  bigTicket: boolean;
  actions: WorkPackageAction[];
}

// ============================================================================
// Filter State Types
// ============================================================================

/**
 * Filter state for work packages
 */
export interface FilterState {
  searchQuery: string;
  selectedWorkPackage: string[];
  selectedLead: string[];
  selectedWorkstream: string[];
  selectedWpFamily: string;
  selectedBigTicket: string[];
  selectedAction: string[];
  selectedTeamMember: string[];
  sortOption: string;
}

// ============================================================================
// Chart Data Types
// ============================================================================

/**
 * Lead chart entry
 */
export interface LeadChartEntry {
  lead: string;
  count: number;
}

/**
 * Workstream chart entry
 */
export interface WorkstreamChartEntry {
  workstream: string;
  count: number;
}

/**
 * Work package chart entry
 */
export interface WorkPackageChartEntry {
  workpackage: string;
  count: number;
}

/**
 * Upcoming milestone chart entry
 */
export interface UpcomingMilestoneChartEntry {
  milestone: string;
  count: number;
  deadline: string | null;
  actionNumber: number | string | null;
  workPackageNumber: number | string | null;
  workPackageName: string | null;
}

/**
 * Statistics data for display
 */
export interface StatsData {
  workstreams: number;
  workpackages: number;
  actions: number;
  leads: number;
  teamMembers: number;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Chart search queries
 */
export interface ChartSearchState {
  chartSearchQuery: string;
  workstreamChartSearchQuery: string;
  workpackageChartSearchQuery: string;
  upcomingMilestonesChartSearchQuery: string;
  milestonesPerMonthSearchQuery: string;
  leaderChecklistSearchQuery: string;
}

