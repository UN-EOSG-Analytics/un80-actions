"use server";

import { query } from "@/lib/db/db";
import { getActionMilestones } from "@/features/milestones/queries";
import type {
  Action,
  ActionFilters,
  ActionsResponse,
  ActionsTableData,
  ActionWithMilestones,
  ActionWithNotes,
  ActionWithQuestions,
  ActionWithUpdates,
  PaginationOptions,
  SortOptions,
  Workstream,
  WorkPackage,
  WorkPackageWithActions,
} from "@/types";

// =========================================================
// SQL QUERY FRAGMENTS
// =========================================================

/**
 * Base SELECT clause for actions with all joined data
 */
const ACTION_SELECT = `
  SELECT
    a.id,
    a.sub_id,
    a.action_record_id,
    a.id as action_number,
    CASE
      WHEN a.sub_id IS NOT NULL THEN a.id::text || a.sub_id
      ELSE a.id::text
    END as action_display_id,
    -- Workstream info
    ws.id as workstream_id,
    ws.id as report,
    ws.report_title,
    -- Work package info
    wp.id as work_package_id,
    wp.id as work_package_number,
    wp.work_package_title as work_package_name,
    wp.work_package_goal,
    -- Action content
    a.indicative_action as indicative_activity,
    a.sub_action as sub_action_details,
    -- Document reference
    a.document_paragraph_number as document_paragraph,
    a.document_paragraph_text as doc_text,
    -- Implementation details
    a.scope_definition,
    a.legal_considerations,
    a.proposal_advancement_scenario,
    a.un_budgets,
    -- Flags
    a.is_big_ticket,
    a.needs_member_state_engagement,
    -- Status
    a.tracking_status,
    a.public_action_status,
    -- Aggregated leads (from action_leads table)
    COALESCE(
      (SELECT array_agg(DISTINCT al.lead_name)
       FROM action_leads al
       WHERE al.action_id = a.id
         AND (al.action_sub_id IS NOT DISTINCT FROM a.sub_id)),
      ARRAY[]::text[]
    ) as action_leads,
    -- Aggregated work package leads
    COALESCE(
      (SELECT array_agg(DISTINCT wpl.lead_name)
       FROM work_package_leads wpl
       WHERE wpl.work_package_id = wp.id),
      ARRAY[]::text[]
    ) as work_package_leads,
    -- Aggregated focal points
    COALESCE(
      (SELECT array_agg(DISTINCT afp.user_email)
       FROM action_focal_points afp
       WHERE afp.action_id = a.id
         AND (afp.action_sub_id IS NOT DISTINCT FROM a.sub_id)),
      ARRAY[]::text[]
    ) as action_focal_points,
    -- Aggregated support persons
    COALESCE(
      (SELECT array_agg(DISTINCT asp.user_email)
       FROM action_support_persons asp
       WHERE asp.action_id = a.id
         AND (asp.action_sub_id IS NOT DISTINCT FROM a.sub_id)),
      ARRAY[]::text[]
    ) as action_support_persons,
    -- Aggregated member persons
    COALESCE(
      (SELECT array_agg(DISTINCT amp.user_email)
       FROM action_member_persons amp
       WHERE amp.action_id = a.id
         AND (amp.action_sub_id IS NOT DISTINCT FROM a.sub_id)),
      ARRAY[]::text[]
    ) as action_member_persons,
    -- Aggregated member entities (semicolon-separated)
    COALESCE(
      (SELECT string_agg(DISTINCT ame.entity_id, ';')
       FROM action_member_entities ame
       WHERE ame.action_id = a.id
         AND (ame.action_sub_id IS NOT DISTINCT FROM a.sub_id)),
      ''
    ) as action_entities,
    -- Upcoming milestone (most recent with 'upcoming' type or earliest non-completed)
    (SELECT am.description
     FROM action_milestones am
     WHERE am.action_id = a.id
       AND (am.action_sub_id IS NOT DISTINCT FROM a.sub_id)
       AND am.milestone_type = 'upcoming'
     ORDER BY am.deadline ASC NULLS LAST
     LIMIT 1
    ) as upcoming_milestone,
    -- Delivery date (from upcoming milestone)
    (SELECT am.deadline::text
     FROM action_milestones am
     WHERE am.action_id = a.id
       AND (am.action_sub_id IS NOT DISTINCT FROM a.sub_id)
       AND am.milestone_type = 'upcoming'
     ORDER BY am.deadline ASC NULLS LAST
     LIMIT 1
    ) as delivery_date,
    -- Latest update content
    (SELECT au.content
     FROM action_updates au
     WHERE au.action_id = a.id
       AND (au.action_sub_id IS NOT DISTINCT FROM a.sub_id)
     ORDER BY au.created_at DESC
     LIMIT 1
    ) as updates
  FROM actions a
  JOIN work_packages wp ON a.work_package_id = wp.id
  JOIN workstreams ws ON wp.workstream_id = ws.id
`;

// =========================================================
// PRIVATE HELPER FUNCTIONS
// =========================================================

interface ActionRow {
  id: number;
  sub_id: string | null;
  action_record_id: string | null;
  action_number: number;
  action_display_id: string;
  workstream_id: string;
  report: string;
  report_title: string | null;
  work_package_id: number;
  work_package_number: number;
  work_package_name: string;
  work_package_goal: string | null;
  indicative_activity: string;
  sub_action_details: string | null;
  document_paragraph: string | null;
  doc_text: string | null;
  scope_definition: string | null;
  legal_considerations: string | null;
  proposal_advancement_scenario: string | null;
  un_budgets: string | null;
  is_big_ticket: boolean;
  needs_member_state_engagement: boolean;
  tracking_status: string | null;
  public_action_status: string | null;
  action_leads: string[] | null;
  work_package_leads: string[] | null;
  action_focal_points: string[] | null;
  action_support_persons: string[] | null;
  action_member_persons: string[] | null;
  action_entities: string;
  upcoming_milestone: string | null;
  delivery_date: string | null;
  updates: string | null;
}

/**
 * Transform database row to Action type
 */
function rowToAction(row: ActionRow): Action {
  return {
    id: row.id,
    sub_id: row.sub_id,
    action_record_id: row.action_record_id,
    action_number: row.action_number,
    action_display_id: row.action_display_id,
    workstream_id: row.workstream_id,
    report: row.report,
    report_title: row.report_title,
    work_package_id: row.work_package_id,
    work_package_number: row.work_package_number,
    work_package_name: row.work_package_name,
    work_package_goal: row.work_package_goal,
    indicative_activity: row.indicative_activity,
    sub_action_details: row.sub_action_details,
    document_paragraph: row.document_paragraph,
    doc_text: row.doc_text,
    scope_definition: row.scope_definition,
    legal_considerations: row.legal_considerations,
    proposal_advancement_scenario: row.proposal_advancement_scenario,
    un_budgets: row.un_budgets,
    is_big_ticket: row.is_big_ticket,
    needs_member_state_engagement: row.needs_member_state_engagement,
    tracking_status: row.tracking_status as Action["tracking_status"],
    public_action_status:
      row.public_action_status as Action["public_action_status"],
    action_leads: row.action_leads ?? [],
    work_package_leads: row.work_package_leads ?? [],
    action_focal_points: row.action_focal_points ?? [],
    action_support_persons: row.action_support_persons ?? [],
    action_member_persons: row.action_member_persons ?? [],
    action_entities: row.action_entities ?? "",
    upcoming_milestone: row.upcoming_milestone,
    delivery_date: row.delivery_date,
    updates: row.updates,
  };
}

/**
 * Build WHERE clause and parameters from filters
 */
function buildWhereClause(
  filters: ActionFilters,
  startParamIndex: number = 1,
): { clause: string; params: unknown[]; nextIndex: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = startParamIndex;

  if (filters.workstream_id) {
    conditions.push(`ws.id = $${paramIndex++}`);
    params.push(filters.workstream_id);
  }

  if (filters.work_package_id !== undefined) {
    conditions.push(`wp.id = $${paramIndex++}`);
    params.push(filters.work_package_id);
  }

  if (filters.tracking_status) {
    conditions.push(`a.tracking_status = $${paramIndex++}`);
    params.push(filters.tracking_status);
  }

  if (filters.public_action_status) {
    conditions.push(`a.public_action_status = $${paramIndex++}`);
    params.push(filters.public_action_status);
  }

  if (filters.is_big_ticket !== undefined) {
    conditions.push(`a.is_big_ticket = $${paramIndex++}`);
    params.push(filters.is_big_ticket);
  }

  if (filters.needs_member_state_engagement !== undefined) {
    conditions.push(`a.needs_member_state_engagement = $${paramIndex++}`);
    params.push(filters.needs_member_state_engagement);
  }

  if (filters.lead_name) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM action_leads al
        WHERE al.action_id = a.id
          AND (al.action_sub_id IS NOT DISTINCT FROM a.sub_id)
          AND al.lead_name ILIKE $${paramIndex++}
      )
    `);
    params.push(`%${filters.lead_name}%`);
  }

  if (filters.entity) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM action_member_entities ame
        WHERE ame.action_id = a.id
          AND (ame.action_sub_id IS NOT DISTINCT FROM a.sub_id)
          AND ame.entity_id ILIKE $${paramIndex++}
      )
    `);
    params.push(`%${filters.entity}%`);
  }

  if (filters.search) {
    conditions.push(`
      (a.indicative_action ILIKE $${paramIndex}
       OR a.sub_action ILIKE $${paramIndex}
       OR a.document_paragraph_text ILIKE $${paramIndex}
       OR wp.work_package_title ILIKE $${paramIndex})
    `);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
    nextIndex: paramIndex,
  };
}

/**
 * Build ORDER BY clause from sort options
 */
function buildOrderClause(sort?: SortOptions): string {
  if (!sort) {
    return "ORDER BY a.id ASC, a.sub_id ASC NULLS FIRST";
  }

  const direction = sort.direction === "desc" ? "DESC" : "ASC";

  // Map Action fields to SQL columns
  const fieldMap: Record<string, string> = {
    id: "a.id",
    action_number: "a.id",
    workstream_id: "ws.id",
    report: "ws.id",
    work_package_id: "wp.id",
    work_package_number: "wp.id",
    tracking_status: "a.tracking_status",
    public_action_status: "a.public_action_status",
    is_big_ticket: "a.is_big_ticket",
    delivery_date: "delivery_date",
  };

  const column = fieldMap[sort.field] || "a.id";
  return `ORDER BY ${column} ${direction}, a.sub_id ASC NULLS FIRST`;
}

// =========================================================
// PUBLIC API FUNCTIONS
// =========================================================

/**
 * Fetch a single action by its numeric ID.
 * Optionally specify sub_id for sub-actions (e.g., "(a)", "(b)").
 */
export async function getActionById(
  id: number,
  subId?: string | null,
): Promise<Action | null> {
  const whereClause = subId
    ? "WHERE a.id = $1 AND a.sub_id = $2"
    : "WHERE a.id = $1 AND a.sub_id IS NULL";

  const params = subId ? [id, subId] : [id];

  const rows = await query<ActionRow>(
    `${ACTION_SELECT} ${whereClause}`,
    params,
  );

  return rows.length > 0 ? rowToAction(rows[0]) : null;
}

/**
 * Fetch a single action by action_number (for display purposes).
 * This finds the primary action with that ID (sub_id IS NULL).
 * Optionally filter by first milestone for deep linking.
 */
export async function getActionByNumber(
  actionId: number,
  actionSubId?: string | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  firstMilestone?: string | null,
): Promise<Action | null> {
  // Match exact action by id and sub_id (or null)
  // TODO: Use firstMilestone to filter or highlight specific milestone
  const rows = await query<ActionRow>(
    `${ACTION_SELECT}
     WHERE a.id = $1
       AND (a.sub_id IS NOT DISTINCT FROM $2)
     LIMIT 1`,
    [actionId, actionSubId ?? null],
  );

  if (rows.length === 0) return null;

  const action = rowToAction(rows[0]);

  // Milestones are loaded lazily when the user opens the Milestones tab

  return action;
}

/**
 * Fetch all actions with optional filtering, pagination, and sorting.
 */
export async function getActions(
  filters: ActionFilters = {},
  pagination: PaginationOptions = {},
  sort?: SortOptions,
): Promise<ActionsResponse> {
  const { limit = 50, offset = 0 } = pagination;

  const { clause: whereClause, params: filterParams } =
    buildWhereClause(filters);
  const orderClause = buildOrderClause(sort);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM actions a
    JOIN work_packages wp ON a.work_package_id = wp.id
    JOIN workstreams ws ON wp.workstream_id = ws.id
    ${whereClause}
  `;

  const countResult = await query<{ total: string }>(countQuery, filterParams);
  const total = parseInt(countResult[0]?.total || "0", 10);

  // Get paginated results
  const dataQuery = `
    ${ACTION_SELECT}
    ${whereClause}
    ${orderClause}
    LIMIT $${filterParams.length + 1}
    OFFSET $${filterParams.length + 2}
  `;

  const rows = await query<ActionRow>(dataQuery, [
    ...filterParams,
    limit,
    offset,
  ]);

  return {
    actions: rows.map(rowToAction),
    total,
    limit,
    offset,
  };
}

/**
 * Fetch actions by workstream ID (e.g., "WS1", "WS2").
 */
export async function getActionsByWorkstream(
  workstreamId: string,
  pagination?: PaginationOptions,
  sort?: SortOptions,
): Promise<ActionsResponse> {
  return getActions({ workstream_id: workstreamId }, pagination, sort);
}

/**
 * Fetch actions by work package ID.
 */
export async function getActionsByWorkPackage(
  workPackageId: number,
  pagination?: PaginationOptions,
  sort?: SortOptions,
): Promise<ActionsResponse> {
  return getActions({ work_package_id: workPackageId }, pagination, sort);
}

/**
 * Fetch actions assigned to a specific lead.
 */
export async function getActionsByLead(
  leadName: string,
  pagination?: PaginationOptions,
  sort?: SortOptions,
): Promise<ActionsResponse> {
  return getActions({ lead_name: leadName }, pagination, sort);
}

/**
 * Fetch actions associated with a specific entity.
 */
export async function getActionsByEntity(
  entity: string,
  pagination?: PaginationOptions,
  sort?: SortOptions,
): Promise<ActionsResponse> {
  return getActions({ entity }, pagination, sort);
}

/**
 * Search actions by text query across multiple fields.
 */
export async function searchActions(
  searchQuery: string,
  filters?: Omit<ActionFilters, "search">,
  pagination?: PaginationOptions,
  sort?: SortOptions,
): Promise<ActionsResponse> {
  return getActions({ ...filters, search: searchQuery }, pagination, sort);
}

// =========================================================
// REFERENCE DATA FUNCTIONS
// =========================================================

/**
 * Fetch all workstreams.
 */
export async function getWorkstreams(): Promise<Workstream[]> {
  return query<Workstream>(
    `SELECT id, workstream_title, report_title, report_document_symbol
     FROM workstreams
     ORDER BY id`,
  );
}

/**
 * Fetch all work packages, optionally filtered by workstream.
 */
export async function getWorkPackages(
  workstreamId?: string,
): Promise<WorkPackage[]> {
  if (workstreamId) {
    return query<WorkPackage>(
      `SELECT id, workstream_id, work_package_title, work_package_goal
       FROM work_packages
       WHERE workstream_id = $1
       ORDER BY id`,
      [workstreamId],
    );
  }

  return query<WorkPackage>(
    `SELECT id, workstream_id, work_package_title, work_package_goal
     FROM work_packages
     ORDER BY workstream_id, id`,
  );
}

/**
 * Fetch all unique lead names.
 */
export async function getLeadNames(): Promise<string[]> {
  const rows = await query<{ name: string }>(
    `SELECT DISTINCT name FROM leads ORDER BY name`,
  );
  return rows.map((r) => r.name);
}

/**
 * Fetch all unique entity IDs used in actions.
 */
export async function getActionEntities(): Promise<string[]> {
  const rows = await query<{ entity_id: string }>(
    `SELECT DISTINCT entity_id FROM action_member_entities ORDER BY entity_id`,
  );
  return rows.map((r) => r.entity_id);
}

// =========================================================
// STATISTICS & AGGREGATION FUNCTIONS
// =========================================================

/**
 * Get action counts grouped by workstream.
 */
export async function getActionCountsByWorkstream(): Promise<
  Array<{ workstream_id: string; count: number }>
> {
  return query<{ workstream_id: string; count: number }>(
    `SELECT ws.id as workstream_id, COUNT(a.id)::int as count
     FROM workstreams ws
     LEFT JOIN work_packages wp ON wp.workstream_id = ws.id
     LEFT JOIN actions a ON a.work_package_id = wp.id
     GROUP BY ws.id
     ORDER BY ws.id`,
  );
}

/**
 * Get action counts grouped by work package.
 */
export async function getActionCountsByWorkPackage(
  workstreamId?: string,
): Promise<Array<{ work_package_id: number; count: number }>> {
  const whereClause = workstreamId ? "WHERE wp.workstream_id = $1" : "";
  const params = workstreamId ? [workstreamId] : [];

  return query<{ work_package_id: number; count: number }>(
    `SELECT wp.id as work_package_id, COUNT(a.id)::int as count
     FROM work_packages wp
     LEFT JOIN actions a ON a.work_package_id = wp.id
     ${whereClause}
     GROUP BY wp.id
     ORDER BY wp.id`,
    params,
  );
}

/**
 * Get action counts grouped by status.
 */
export async function getActionCountsByStatus(): Promise<
  Array<{ status: string | null; count: number }>
> {
  return query<{ status: string | null; count: number }>(
    `SELECT public_action_status as status, COUNT(*)::int as count
     FROM actions
     GROUP BY public_action_status
     ORDER BY public_action_status`,
  );
}

/**
 * Get summary statistics for dashboard.
 */
export async function getActionsSummary(): Promise<{
  total: number;
  by_status: Array<{ status: string | null; count: number }>;
  big_ticket_count: number;
  member_state_engagement_count: number;
}> {
  const [totalResult, statusCounts, bigTicketResult, memberStateResult] =
    await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text as count FROM actions`),
      getActionCountsByStatus(),
      query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM actions WHERE is_big_ticket = true`,
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM actions WHERE needs_member_state_engagement = true`,
      ),
    ]);

  return {
    total: parseInt(totalResult[0]?.count || "0", 10),
    by_status: statusCounts,
    big_ticket_count: parseInt(bigTicketResult[0]?.count || "0", 10),
    member_state_engagement_count: parseInt(
      memberStateResult[0]?.count || "0",
      10,
    ),
  };
}

// =========================================================
// TABLE DATA QUERY
// =========================================================

function toIso(d: Date | null | undefined): string {
  if (!d) return "";
  return d instanceof Date ? d.toISOString() : String(d);
}

function actionKey(id: number, subId: string | null): string {
  return `${id}:${subId ?? ""}`;
}

/**
 * Get actions table data for the main page.
 * Loads work packages with actions, milestones, updates, notes, and questions.
 */
export async function getActionsTableData(): Promise<ActionsTableData> {
  const empty: ActionsTableData = {
    workPackages: [],
    actionsWithUpdates: [],
    actionsWithNotes: [],
    actionsWithQuestions: [],
  };

  const wpSelectWithRisk = `
    SELECT
      wp.id AS wp_id,
      wp.work_package_title,
      a.id AS action_id,
      a.sub_id AS action_sub_id,
      a.indicative_action,
      a.tracking_status,
      a.public_action_status,
      a.is_big_ticket,
      a.risk_assessment,
      COALESCE(a.document_submitted, false) AS document_submitted,
      m.milestone_type,
      m.description AS milestone_description,
      m.deadline::text AS milestone_deadline,
      m.updates AS milestone_updates,
      m.status AS milestone_status,
      (SELECT COALESCE(next_m.milestone_document_submitted, false)
       FROM un80actions.action_milestones next_m
       WHERE next_m.action_id = a.id
         AND (next_m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND next_m.is_public = false
         AND next_m.deadline IS NOT NULL
         AND next_m.deadline >= CURRENT_DATE
       ORDER BY next_m.deadline ASC
       LIMIT 1) AS next_upcoming_milestone_document_submitted,
      (SELECT EXTRACT(MONTH FROM next_m.deadline)::integer
       FROM un80actions.action_milestones next_m
       WHERE next_m.action_id = a.id
         AND (next_m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND next_m.is_public = false
         AND next_m.deadline IS NOT NULL
         AND next_m.deadline >= CURRENT_DATE
       ORDER BY next_m.deadline ASC
       LIMIT 1) AS next_upcoming_milestone_deadline_month,
      (SELECT ARRAY_AGG(DISTINCT EXTRACT(MONTH FROM all_m.deadline)::integer ORDER BY EXTRACT(MONTH FROM all_m.deadline)::integer)
       FROM un80actions.action_milestones all_m
       WHERE all_m.action_id = a.id
         AND (all_m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND all_m.is_public = false
         AND all_m.deadline IS NOT NULL
         AND (all_m.deadline >= CURRENT_DATE OR (EXTRACT(YEAR FROM all_m.deadline) = 2026 AND EXTRACT(MONTH FROM all_m.deadline) = 1))) AS all_upcoming_milestone_months
    FROM work_packages wp
    JOIN actions a ON a.work_package_id = wp.id
    LEFT JOIN action_milestones m ON m.action_id = a.id
      AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
    ORDER BY wp.id, a.id, a.sub_id, m.milestone_type
  `;
  const wpSelectWithoutRisk = `
    SELECT
      wp.id AS wp_id,
      wp.work_package_title,
      a.id AS action_id,
      a.sub_id AS action_sub_id,
      a.indicative_action,
      a.tracking_status,
      a.public_action_status,
      a.is_big_ticket,
      COALESCE(a.document_submitted, false) AS document_submitted,
      m.milestone_type,
      m.description AS milestone_description,
      m.deadline::text AS milestone_deadline,
      m.updates AS milestone_updates,
      m.status AS milestone_status,
      (SELECT COALESCE(next_m.milestone_document_submitted, false)
       FROM un80actions.action_milestones next_m
       WHERE next_m.action_id = a.id
         AND (next_m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND next_m.is_public = false
         AND next_m.deadline IS NOT NULL
         AND next_m.deadline >= CURRENT_DATE
       ORDER BY next_m.deadline ASC
       LIMIT 1) AS next_upcoming_milestone_document_submitted,
      (SELECT EXTRACT(MONTH FROM next_m.deadline)::integer
       FROM un80actions.action_milestones next_m
       WHERE next_m.action_id = a.id
         AND (next_m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND next_m.is_public = false
         AND next_m.deadline IS NOT NULL
         AND next_m.deadline >= CURRENT_DATE
       ORDER BY next_m.deadline ASC
       LIMIT 1) AS next_upcoming_milestone_deadline_month,
      (SELECT ARRAY_AGG(DISTINCT EXTRACT(MONTH FROM all_m.deadline)::integer ORDER BY EXTRACT(MONTH FROM all_m.deadline)::integer)
       FROM un80actions.action_milestones all_m
       WHERE all_m.action_id = a.id
         AND (all_m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
         AND all_m.is_public = false
         AND all_m.deadline IS NOT NULL
         AND (all_m.deadline >= CURRENT_DATE OR (EXTRACT(YEAR FROM all_m.deadline) = 2026 AND EXTRACT(MONTH FROM all_m.deadline) = 1))) AS all_upcoming_milestone_months
    FROM work_packages wp
    JOIN actions a ON a.work_package_id = wp.id
    LEFT JOIN action_milestones m ON m.action_id = a.id
      AND (m.action_sub_id IS NOT DISTINCT FROM a.sub_id)
    ORDER BY wp.id, a.id, a.sub_id, m.milestone_type
  `;

  type WpRow = {
    wp_id: number;
    work_package_title: string;
    action_id: number;
    action_sub_id: string | null;
    indicative_action: string;
    tracking_status: string | null;
    public_action_status: string | null;
    is_big_ticket: boolean;
    risk_assessment?: string | null;
    document_submitted?: boolean;
    milestone_type: string | null;
    milestone_description: string | null;
    milestone_deadline: string | null;
    milestone_updates: string | null;
    milestone_status: string | null;
  };

  try {
    let wpRows: WpRow[];
    try {
      wpRows = await query<WpRow>(wpSelectWithRisk);
    } catch (wpErr) {
      const msg = String((wpErr as Error).message ?? "");
      const code = (wpErr as { code?: string })?.code;
      if (
        code === "42703" ||
        msg.includes("risk_assessment") ||
        msg.includes("does not exist")
      ) {
        wpRows = await query<WpRow>(wpSelectWithoutRisk);
      } else {
        throw wpErr;
      }
    }

    const [updateRows, noteRows, questionRows] = await Promise.all([
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
        wp = {
          id: r.wp_id,
          work_package_title: r.work_package_title,
          actions: [],
        };
        workPackagesMap.set(r.wp_id, wp);
      }
      const key = actionKey(r.action_id, r.action_sub_id);
      let action = actionsMap.get(key);
      if (!action) {
        action = {
          action_id: r.action_id,
          action_sub_id: r.action_sub_id,
          indicative_action: r.indicative_action,
          tracking_status: r.tracking_status as ActionWithMilestones["tracking_status"],
          public_action_status: r.public_action_status as ActionWithMilestones["public_action_status"],
          is_big_ticket: r.is_big_ticket,
          risk_assessment: (r.risk_assessment ?? null) as ActionWithMilestones["risk_assessment"],
          document_submitted: r.document_submitted ?? false,
          deliverables_status: r.next_upcoming_milestone_document_submitted === true ? "submitted" : r.next_upcoming_milestone_document_submitted === false ? "not_submitted" : null,
          deliverables_deadline_month: r.next_upcoming_milestone_deadline_month ?? null,
          upcoming_milestone_months: Array.isArray(r.all_upcoming_milestone_months) ? r.all_upcoming_milestone_months : [],
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
      (a, b) => a.id - b.id,
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
        (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? ""),
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
        (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? ""),
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
        (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? ""),
    );

    return {
      workPackages,
      actionsWithUpdates,
      actionsWithNotes,
      actionsWithQuestions,
    };
  } catch {
    return empty;
  }
}
