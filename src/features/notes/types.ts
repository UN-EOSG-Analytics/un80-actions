import type { ActionNote } from "@/types";

// =========================================================
// TYPES
// =========================================================

export interface NoteCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  content: string;
}

export interface NoteUpdateInput {
  content: string;
}

export interface NoteResult {
  success: boolean;
  error?: string;
  note?: ActionNote;
}
