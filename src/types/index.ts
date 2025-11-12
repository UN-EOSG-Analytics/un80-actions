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
    work_package_number: string;

    /** Name/title of the work package */
    work_package_name: string;

    /** Paragraph reference in the document */
    document_paragraph: string;

    /** Unique action number as a string */
    action_number: string;

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
