"use server";

import { query } from "./db";
import type {
  Action,
  ActionFilters,
  ActionsResponse,
  PaginationOptions,
  SortOptions,
  Workstream,
  WorkPackage,
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
  actionNumber: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  firstMilestone?: string | null,
): Promise<Action | null> {
  // First try to find exact match (no sub_id), then fall back to any with that ID
  // TODO: Use firstMilestone to filter or highlight specific milestone
  const rows = await query<ActionRow>(
    `${ACTION_SELECT}
     WHERE a.id = $1
     ORDER BY a.sub_id ASC NULLS FIRST
     LIMIT 1`,
    [actionNumber],
  );

  if (rows.length === 0) return null;

  const action = rowToAction(rows[0]);

  // Optionally load milestones for detailed view
  action.milestones = await getActionMilestones(action.id, action.sub_id);

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
