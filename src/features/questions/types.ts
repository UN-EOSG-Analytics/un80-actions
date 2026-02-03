import type { ActionQuestion } from "@/types";

// =========================================================
// TYPES
// =========================================================

export interface QuestionCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  question: string;
}

export interface QuestionResult {
  success: boolean;
  error?: string;
  question?: ActionQuestion;
}
