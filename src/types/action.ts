/**
 * Type definitions for UN80 Actions data structure
 * Based on the actions.json data format
 */

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
  
  /** Whether this is a "big ticket" item ("Yes" or "No") */
  big_ticket: "Yes" | "No" | "";
  
  /** Comma-separated list of work package leads */
  work_package_leads: string;
  
  /** First milestone date in Excel serial format (e.g., "46081") or empty string */
  first_milestone: string;
  
  /** Whether Member State approval is required ("Yes" or "No") */
  ms_approval: "Yes" | "No" | "";
  
  /** Member State body abbreviation (e.g., "GA", "SC", "ECOSOC") or empty string */
  ms_body: string;
  
  /** Legal considerations and requirements or empty string */
  legal_consideration: string;
  
  /** UN budget information or empty string */
  un_budget: string;
}

/**
 * Array of Action items
 */
export type Actions = Action[];

/**
 * Work package leads that appear in the data
 */
export type WorkPackageLead = 
  | "USG DPPA"
  | "USG DPO"
  | "DSG"
  | "USG OCHA"
  | "USG DESA"
  | "SG ITU"
  | "HC OHCHR"
  | "USG Policy"
  | "ASG DCO"
  | "Chair HLCM"
  | "ED WFP"
  | "Chair DTN"
  | "ED UNICEF"
  | "ASG UNITAR"
  | "USG UNU"
  | "SA Reform"
  | "USG DGACM"
  | "CDC"
  | "USG ODA"
  | "USG UNEP"
  | "USG ECA"
  | "USG UNODC"
  | "USG OCT"
  | "Administrator UNDP"
  | "ED UNOPS"
  | "ED UNFPA"
  | "ED UN Women"
  | "ED UNAIDS"
  | "SG"
  | string; // Allow other values

/**
 * Member State bodies
 */
export type MSBody = 
  | "GA" 
  | "SC" 
  | "ECOSOC" 
  | "SPECIALIZED AGENCIES"
  | "SG"
  | "UNU"
  | string; // Allow other values

/**
 * Report types
 */
export type ReportType = "WS2" | "WS3" | string;

/**
 * Helper type for filtering actions
 */
export interface ActionFilters {
  report?: string;
  work_package_number?: string;
  work_package_name?: string;
  big_ticket?: "Yes" | "No";
  ms_approval?: "Yes" | "No";
  work_package_leads?: string;
}
