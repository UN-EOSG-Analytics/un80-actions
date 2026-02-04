import type { ActionNote } from "@/types";

// =========================================================
// TYPES
// =========================================================

export interface NoteCreateInput {
  action_id: number;
  action_sub_id?: string | null;
  header: string;
  note_date: string; // ISO date string (YYYY-MM-DD)
  content: string;
}

export interface NoteUpdateInput {
  header: string;
  note_date: string; // ISO date string (YYYY-MM-DD)
  content: string;
}

export interface NoteResult {
  success: boolean;
  error?: string;
  note?: ActionNote;
}
