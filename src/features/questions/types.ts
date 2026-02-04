import type { ActionQuestion } from "@/types";

// =========================================================
// TYPES
// =========================================================

export interface QuestionCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  header: string;
  question_date: string; // ISO date string (YYYY-MM-DD)
  question: string;
  milestone_id?: string | null;
}

export interface QuestionUpdateInput {
  header: string;
  question_date: string; // ISO date string (YYYY-MM-DD)
  question: string;
  milestone_id?: string | null;
}

export interface QuestionResult {
  success: boolean;
  error?: string;
  question?: ActionQuestion;
}
