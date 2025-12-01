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

  /** First milestone date in ISO format (e.g., "2026-02-28") or null */
  first_milestone: string | null;

  /** Whether Member State approval is required */
  ms_approval: boolean;

  /** Member State body abbreviation (e.g., "GA", "SC", "ECOSOC") or null */
  ms_body: string[];

  /** Legal considerations and requirements or null */
  legal_consideration: string | null;

  /** Array of UN budget information */
  un_budget: string[];

  /** Work package goal description or null */
  work_package_goal: string | null;

  /** Document text or null */
  doc_text: string | null;
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
 * Statistics data for display
 */
export interface StatsData {
  workstreams: number;
  workpackages: number;
  actions: number;
  leads: number;
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
}

/**
 * Collapsible visibility state
 */
export interface CollapsibleState {
  showAllLeads: boolean;
  showAllWorkstreams: boolean;
  showAllWorkpackages: boolean;
  isAdvancedFilterOpen: boolean;
}
