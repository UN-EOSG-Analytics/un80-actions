/**
 * Server-only data loading for the actions table (Work Package, Action Updates, Notes, Questions).
 * Reads directly from Postgres; no API. Use only in Server Components.
 */

import { query } from "@/lib/db";
import type {
  ActionsTableData,
  ActionWithMilestones,
  ActionWithNotes,
  ActionWithQuestions,
  ActionWithUpdates,
  MilestoneRow,
  NoteRow,
  QuestionRow,
  UpdateRow,
  WorkPackageWithActions,
} from "@/types";

function toIso(d: Date | null | undefined): string {
  if (!d) return "";
  return d instanceof Date ? d.toISOString() : String(d);
}

function actionKey(id: number, subId: string | null): string {
  return `${id}:${subId ?? ""}`;
}

export async function getActionsTableData(): Promise<ActionsTableData> {
  const empty: ActionsTableData = {
    workPackages: [],
    actionsWithUpdates: [],
    actionsWithNotes: [],
    actionsWithQuestions: [],
  };

  try {
    const [wpRows, updateRows, noteRows, questionRows] = await Promise.all([
      query<{
        wp_id: number;
        work_package_title: string;
        action_id: number;
        action_sub_id: string | null;
        indicative_action: string;
        tracking_status: string | null;
        is_big_ticket: boolean;
        milestone_type: string | null;
        milestone_description: string | null;
        milestone_deadline: string | null;
        milestone_updates: string | null;
        milestone_status: string | null;
      }>(`
        SELECT
          wp.id AS wp_id,
          wp.work_package_title,
          a.id AS action_id,
          a.sub_id AS action_sub_id,
          a.indicative_action,
          a.tracking_status,
          a.is_big_ticket,
          m.milestone_type,
          m.description AS milestone_description,
          m.deadline::text AS milestone_deadline,
          m.updates AS milestone_updates,
          m.status AS milestone_status
        FROM work_packages wp
        JOIN actions a ON a.work_package_id = wp.id
        LEFT JOIN action_milestones m ON m.action_id = a.id
          AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
        ORDER BY wp.id, a.id, a.sub_id, m.milestone_type
      `),
      query<{
        action_id: number;
        action_sub_id: string | null;
        work_package_id: number;
        wp_id: number;
        indicative_action: string;
        update_id: string;
        update_content: string;
        update_created_at: Date;
      }>(`
        SELECT
          a.id AS action_id,
          a.sub_id AS action_sub_id,
          a.work_package_id,
          wp.id AS wp_id,
          a.indicative_action,
          u.id AS update_id,
          u.content AS update_content,
          u.created_at AS update_created_at
        FROM actions a
        JOIN work_packages wp ON wp.id = a.work_package_id
        LEFT JOIN action_updates u ON u.action_id = a.id
          AND (u.action_sub_id IS NOT DISTINCT FROM a.sub_id)
        ORDER BY a.work_package_id, a.id, a.sub_id, u.created_at
      `),
      query<{
        action_id: number;
        action_sub_id: string | null;
        work_package_id: number;
        wp_id: number;
        indicative_action: string;
        note_id: string;
        note_content: string;
        note_created_at: Date;
      }>(`
        SELECT
          a.id AS action_id,
          a.sub_id AS action_sub_id,
          a.work_package_id,
          wp.id AS wp_id,
          a.indicative_action,
          n.id AS note_id,
          n.content AS note_content,
          n.created_at AS note_created_at
        FROM actions a
        JOIN work_packages wp ON wp.id = a.work_package_id
        LEFT JOIN action_notes n ON n.action_id = a.id
          AND (n.action_sub_id IS NOT DISTINCT FROM a.sub_id)
        ORDER BY a.work_package_id, a.id, a.sub_id, n.created_at
      `),
      query<{
        action_id: number;
        action_sub_id: string | null;
        work_package_id: number;
        wp_id: number;
        indicative_action: string;
        q_id: string;
        q_question: string;
        q_answer: string | null;
        q_created_at: Date;
      }>(`
        SELECT
          a.id AS action_id,
          a.sub_id AS action_sub_id,
          a.work_package_id,
          wp.id AS wp_id,
          a.indicative_action,
          q.id AS q_id,
          q.question AS q_question,
          q.answer AS q_answer,
          q.created_at AS q_created_at
        FROM actions a
        JOIN work_packages wp ON wp.id = a.work_package_id
        LEFT JOIN action_questions q ON q.action_id = a.id
          AND (q.action_sub_id IS NOT DISTINCT FROM a.sub_id)
        ORDER BY a.work_package_id, a.id, a.sub_id, q.created_at
      `),
    ]);

    const workPackagesMap = new Map<number, WorkPackageWithActions>();
    const actionsMap = new Map<string, ActionWithMilestones>();

    for (const r of wpRows) {
      let wp = workPackagesMap.get(r.wp_id);
      if (!wp) {
        wp = { id: r.wp_id, work_package_title: r.work_package_title, actions: [] };
        workPackagesMap.set(r.wp_id, wp);
      }
      const key = actionKey(r.action_id, r.action_sub_id);
      let action = actionsMap.get(key);
      if (!action) {
        action = {
          action_id: r.action_id,
          action_sub_id: r.action_sub_id,
          indicative_action: r.indicative_action,
          tracking_status: r.tracking_status,
          is_big_ticket: r.is_big_ticket,
          milestones: [],
        };
        actionsMap.set(key, action);
        wp.actions.push(action);
      }
      if (r.milestone_type) {
        action.milestones.push({
          milestone_type: r.milestone_type,
          description: r.milestone_description,
          deadline: r.milestone_deadline,
          updates: r.milestone_updates,
          status: r.milestone_status!,
        });
      }
    }

    const workPackages = Array.from(workPackagesMap.values()).sort(
      (a, b) => a.id - b.id
    );

    const updatesByAction = new Map<string, ActionWithUpdates>();
    for (const r of updateRows) {
      const key = actionKey(r.action_id, r.action_sub_id);
      let row = updatesByAction.get(key);
      if (!row) {
        row = {
          action_id: r.action_id,
          action_sub_id: r.action_sub_id,
          work_package_id: r.work_package_id,
          work_package_number: r.wp_id,
          indicative_action: r.indicative_action,
          updates: [],
        };
        updatesByAction.set(key, row);
      }
      if (r.update_id) {
        row.updates.push({
          id: r.update_id,
          content: r.update_content,
          created_at: toIso(r.update_created_at),
        });
      }
    }
    const actionsWithUpdates = Array.from(updatesByAction.values()).sort(
      (a, b) =>
        a.work_package_id - b.work_package_id ||
        a.action_id - b.action_id ||
        (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? "")
    );

    const notesByAction = new Map<string, ActionWithNotes>();
    for (const r of noteRows) {
      const key = actionKey(r.action_id, r.action_sub_id);
      let row = notesByAction.get(key);
      if (!row) {
        row = {
          action_id: r.action_id,
          action_sub_id: r.action_sub_id,
          work_package_id: r.work_package_id,
          work_package_number: r.wp_id,
          indicative_action: r.indicative_action,
          notes: [],
        };
        notesByAction.set(key, row);
      }
      if (r.note_id) {
        row.notes.push({
          id: r.note_id,
          content: r.note_content,
          created_at: toIso(r.note_created_at),
        });
      }
    }
    const actionsWithNotes = Array.from(notesByAction.values()).sort(
      (a, b) =>
        a.work_package_id - b.work_package_id ||
        a.action_id - b.action_id ||
        (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? "")
    );

    const questionsByAction = new Map<string, ActionWithQuestions>();
    for (const r of questionRows) {
      const key = actionKey(r.action_id, r.action_sub_id);
      let row = questionsByAction.get(key);
      if (!row) {
        row = {
          action_id: r.action_id,
          action_sub_id: r.action_sub_id,
          work_package_id: r.work_package_id,
          work_package_number: r.wp_id,
          indicative_action: r.indicative_action,
          questions: [],
        };
        questionsByAction.set(key, row);
      }
      if (r.q_id) {
        row.questions.push({
          id: r.q_id,
          question: r.q_question,
          answer: r.q_answer,
          created_at: toIso(r.q_created_at),
        });
      }
    }
    const actionsWithQuestions = Array.from(questionsByAction.values()).sort(
      (a, b) =>
        a.work_package_id - b.work_package_id ||
        a.action_id - b.action_id ||
        (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? "")
    );

    return {
      workPackages,
      actionsWithUpdates,
      actionsWithNotes,
      actionsWithQuestions,
    };
  } catch (e) {
    console.error("getActionsTableData:", e);
    return empty;
  }
}
