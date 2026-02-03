import type { ActionLegalComment } from "@/types";

// =========================================================
// TYPES
// =========================================================

export interface LegalCommentCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  content: string;
}

export interface LegalCommentResult {
  success: boolean;
  error?: string;
  comment?: ActionLegalComment;
}
