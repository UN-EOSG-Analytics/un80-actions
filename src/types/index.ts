// =========================================================
// ENUM TYPES (matching PostgreSQL schema)
// =========================================================

export type PublicActionStatus = "Further work ongoing" | "Decision taken";

export type ActionTrackingStatus =
  | "Finalized"
  | "Attention to timeline"
  | "No submission"
  | "Confirmation needed";

export type MilestoneType = "first" | "second" | "third" | "upcoming" | "final";

export type MilestoneStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

export type UserRole =
  | "Principal"
  | "Support"
  | "Focal Point"
  | "Assistant"
  | "Admin"
  | "Legal";

export type UserStatus = "Active" | "Inactive";

export type RiskAssessment = "at_risk" | "medium_risk" | "low_risk";

export type ContentReviewStatus = "approved" | "needs_review";

// =========================================================
// BASE ENTITY TYPES
// =========================================================

export interface Workstream {
  id: string;
  workstream_title: string | null;
  report_title: string | null;
  report_document_symbol: string | null;
}

export interface WorkPackage {
  id: number;
  workstream_id: string;
  work_package_title: string;
  work_package_goal: string | null;
}

export interface Lead {
  name: string;
  entity: string | null;
}

export interface ApprovedUser {
  email: string;
  full_name: string | null;
  entity: string | null;
  user_status: UserStatus | null;
  user_role: UserRole | null;
  created_at: Date;
}

export interface User {
  id: string;
  email: string;
  entity?: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  last_login_at: Date | null;
}

// =========================================================
// ACTION TYPES
// =========================================================

/** Base action from the database table */
export interface ActionBase {
  id: number;
  sub_id: string | null;
  work_package_id: number;
  // Content & description
  indicative_action: string;
  sub_action: string | null;
  document_paragraph_number: string | null;
  document_paragraph_text: string | null;
  // Implementation details
  scope_definition: string | null;
  legal_considerations: string | null;
  proposal_advancement_scenario: string | null;
  un_budgets: string | null;
  // Flags
  is_big_ticket: boolean;
  needs_member_state_engagement: boolean;
  // Status & tracking
  tracking_status: ActionTrackingStatus | null;
  public_action_status: PublicActionStatus | null;
  // Airtable reference
  action_record_id: string | null;
}

/** Attachment linked to an action, optionally to a specific milestone */
export interface ActionAttachment {
  id: string;
  action_id: number;
  action_sub_id: string | null;
  milestone_id: string | null; // NULL = general to action
  title: string | null;
  description: string | null;
  filename: string;
  original_filename: string;
  blob_name: string;
  content_type: string;
  file_size: number;
  uploaded_by: string | null;
  uploaded_by_email: string | null;
  uploaded_at: Date;
}

/** Milestone attached to an action */
export interface ActionMilestone {
  id: string;
  action_id: number;
  action_sub_id: string | null;
  serial_number: number;
  milestone_type: MilestoneType;
  is_public: boolean;
  is_draft: boolean;
  is_approved: boolean;
  needs_attention: boolean;
  needs_ola_review: boolean;
  description: string | null;
  deadline: string | null; // ISO date string
  updates: string | null;
  status: MilestoneStatus;
  content_review_status: ContentReviewStatus;
  content_reviewed_by: string | null;
  content_reviewed_by_email: string | null;
  content_reviewed_at: Date | null;
  submitted_by: string | null;
  submitted_by_entity: string | null;
  submitted_at: Date | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  approved_by: string | null;
  approved_at: Date | null;
}

/** Note attached to an action */
export interface ActionNote {
  id: string;
  action_id: number;
  action_sub_id: string | null;
  user_id: string | null;
  user_email: string | null;
  header: string | null;
  note_date: string | null;
  content: string;
  created_at: Date;
  updated_at: Date | null;
  content_review_status: ContentReviewStatus;
  content_reviewed_by: string | null;
  content_reviewed_by_email: string | null;
  content_reviewed_at: Date | null;
}

/** Legal comment attached to an action (approve/processed = strikethrough) */
export interface ActionLegalComment {
  id: string;
  action_id: number;
  action_sub_id: string | null;
  user_id: string | null;
  user_email: string | null;
  content: string;
  /** When set, this comment is a reply to another comment (threaded conversation). */
  reply_to?: string | null;
  created_at: Date;
  updated_at: Date | null;
  content_review_status: ContentReviewStatus;
  content_reviewed_by: string | null;
  content_reviewed_by_email: string | null;
  content_reviewed_at: Date | null;
}

/** Update attached to an action */
export interface ActionUpdate {
  id: string;
  action_id: number;
  action_sub_id: string | null;
  user_id: string | null;
  user_email: string | null;
  content: string;
  created_at: Date;
  updated_at: Date | null;
  content_review_status: ContentReviewStatus;
  content_reviewed_by: string | null;
  content_reviewed_by_email: string | null;
  content_reviewed_at: Date | null;
}

/** Question attached to an action */
export interface ActionQuestion {
  id: string;
  action_id: number;
  action_sub_id: string | null;
  user_id: string;
  user_email: string;
  header: string | null;
  subtext: string | null;
  question_date: string | null; // ISO date string (YYYY-MM-DD)
  question: string;
  answer: string | null;
  answered_by: string | null;
  answered_by_email: string | null;
  answered_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
  content_review_status: ContentReviewStatus;
  content_reviewed_by: string | null;
  content_reviewed_by_email: string | null;
  content_reviewed_at: Date | null;
  milestone_id: string | null;
  /** Internal comment on the question (e.g. for reviewers). */
  comment: string | null;
}

// =========================================================
// ENRICHED ACTION TYPE (with joined data)
// =========================================================

/**
 * Full Action type with related data joined from multiple tables.
 * Used for display in the UI (ActionModal, ActionCard, etc.)
 */
export interface Action {
  // Identifiers
  id: number;
  sub_id: string | null;
  action_record_id: string | null;

  // Computed display field (e.g., "94" or "94(a)")
  action_number: number;
  action_display_id: string;

  // Workstream info
  workstream_id: string;
  report: string; // workstream.id (e.g., "WS1", "WS2")
  report_title: string | null;

  // Work package info
  work_package_id: number;
  work_package_number: number; // work_package.id
  work_package_name: string; // work_package.work_package_title
  work_package_goal: string | null;
  work_package_leads: string[]; // Lead names from work_package_leads

  // Action content
  indicative_activity: string; // indicative_action
  sub_action_details: string | null; // sub_action

  // Document reference
  document_paragraph: string | null; // document_paragraph_number
  doc_text: string | null; // document_paragraph_text

  // Implementation details
  scope_definition: string | null;
  legal_considerations: string | null;
  proposal_advancement_scenario: string | null;
  un_budgets: string | null;

  // Flags
  is_big_ticket: boolean;
  needs_member_state_engagement: boolean;

  // Status & tracking
  tracking_status: ActionTrackingStatus | null;
  public_action_status: PublicActionStatus | null;

  // Related leads & people (joined from relationship tables)
  action_leads: string[]; // Lead names from action_leads
  action_focal_points: string[]; // Emails from action_focal_points
  action_support_persons: string[]; // Emails from action_support_persons
  action_member_persons: string[]; // Emails from action_member_persons
  action_entities: string; // Semicolon-separated entities from action_member_entities

  // Milestone info (simplified for card/list display)
  upcoming_milestone: string | null;
  delivery_date: string | null; // ISO date string

  // Updates summary
  updates: string | null;

  // Full milestone data (for detailed view)
  milestones?: ActionMilestone[];
}

// =========================================================
// QUERY FILTER TYPES
// =========================================================

export interface ActionFilters {
  workstream_id?: string;
  work_package_id?: number;
  tracking_status?: ActionTrackingStatus;
  public_action_status?: PublicActionStatus;
  is_big_ticket?: boolean;
  needs_member_state_engagement?: boolean;
  lead_name?: string;
  entity?: string;
  search?: string; // Full-text search
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  field: keyof Action;
  direction: "asc" | "desc";
}

// =========================================================
// API RESPONSE TYPES
// =========================================================

export interface ActionsResponse {
  actions: Action[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActionResponse {
  action: Action | null;
}

// =========================================================
// ACTIONS TABLE TYPES
// =========================================================

/**
 * Types for the actions table (Work Package, Action Updates, Notes, Questions).
 * Shared by server data loading and client UI; avoid importing from actions-table-data in client code.
 */

export interface MilestoneRow {
  milestone_type: string;
  description: string | null;
  deadline: string | null;
  updates: string | null;
  status: string;
}

export interface ActionWithMilestones {
  action_id: number;
  action_sub_id: string | null;
  indicative_action: string;
  tracking_status: ActionTrackingStatus | null;
  public_action_status: PublicActionStatus | null;
  is_big_ticket: boolean;
  risk_assessment: RiskAssessment | null;
  document_submitted: boolean;
  milestones: MilestoneRow[];
}

export interface WorkPackageWithActions {
  id: number;
  work_package_title: string;
  actions: ActionWithMilestones[];
}

export interface UpdateRow {
  id: string;
  content: string;
  created_at: string; // ISO from server
}

export interface ActionWithUpdates {
  action_id: number;
  action_sub_id: string | null;
  work_package_id: number;
  work_package_number: number;
  indicative_action: string;
  updates: UpdateRow[];
}

export interface NoteRow {
  id: string;
  content: string;
  created_at: string;
}

export interface ActionWithNotes {
  action_id: number;
  action_sub_id: string | null;
  work_package_id: number;
  work_package_number: number;
  indicative_action: string;
  notes: NoteRow[];
}

export interface QuestionRow {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
}

export interface ActionWithQuestions {
  action_id: number;
  action_sub_id: string | null;
  work_package_id: number;
  work_package_number: number;
  indicative_action: string;
  questions: QuestionRow[];
}

export interface ActionsTableData {
  workPackages: WorkPackageWithActions[];
  actionsWithUpdates: ActionWithUpdates[];
  actionsWithNotes: ActionWithNotes[];
  actionsWithQuestions: ActionWithQuestions[];
}

export type ActionsTableTab =
  | "work_package"
  | "action_updates"
  | "notes"
  | "questions";
