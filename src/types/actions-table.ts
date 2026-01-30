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
  tracking_status: string | null;
  is_big_ticket: boolean;
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
