import type { ActionLegalComment } from "@/types";

// =========================================================
// TYPES
// =========================================================

export interface LegalCommentCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  content: string;
  /** When set, creates a reply to this comment (threaded conversation). */
  reply_to?: string | null;
}

export interface LegalCommentResult {
  success: boolean;
  error?: string;
  comment?: ActionLegalComment;
}
