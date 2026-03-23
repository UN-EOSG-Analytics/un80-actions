
# CLAUDE.md

@AGENTS.md

**When starting work on a Next.js project, ALWAYS call the `init` tool from
next-devtools-mcp FIRST to set up proper context and establish documentation
requirements. Do this automatically without being asked.**

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

You are a senior Next.js (v16) / React (v19) developer working on the **UN80 Initiative Actions Dashboard** — a UN tracking tool for the UN80 reform action plan.

Stack: Next.js 16 App Router, TypeScript strict, Tailwind CSS v4.1, shadcn/ui, PostgreSQL (Azure) via `pg`.

## Project Overview

The app tracks 86 reform actions organized into **workstreams → work packages → actions → milestones**. Users authenticate via magic-link email (no passwords).

Role-based access: `Admin`, `Legal`, `Principal`, `Support`, `Focal Point`, `Assistant`.

## Directory Layout

```
src/app/           # Routing only — pages are thin, delegate to features/
src/components/    # Shared UI (non-shadcn); ui/ = shadcn primitives, never edit directly
src/features/      # All real logic — one folder per domain
src/lib/db/        # db.ts (pg Pool + query helper), config.ts (DB_SCHEMA, table names)
src/types/index.ts # Single types file — all shared TypeScript types live here
sql/schema/        # Clean DDL (un80actions_schema.sql) — no migrations here but remember to keep schema up to date
sql/migrations/    # Named 0XX_description.sql files; run manually via DataGrip
```

## Feature Structure (strictly enforced)

Each feature in `src/features/<name>/` follows:

- `queries.ts` — `"use server"` read operations, raw SQL via `query()` helper
- `commands.ts` — `"use server"` write operations + auth checks
- `ui/` — React components owned by this feature

Example: adding a note → `features/notes/commands.ts`; display → `features/notes/ui/NotesList.tsx`.

## Database Conventions

- All tables live in the `un80actions` schema; use `DB_SCHEMA` constant from `@/lib/db/config` — never hardcode the schema name
- Use `query<T>()` from `@/lib/db/db` for reads and writes on non-RLS tables. Use `queryWithUser<T>(email, sql, params)` for any query that touches RLS-protected tables — it wraps the query in a transaction with `set_config('app.current_user_email', ...)` so RLS policies can resolve the current user
- Pool tuned for serverless: max 1 connection, `search_path` set to `un80actions,systemchart,public`; uses PgBouncer on Azure port 6432 in transaction mode
- Actions have a composite PK `(id, sub_id)` — always filter on both: `WHERE id = $1 AND (sub_id IS NOT DISTINCT FROM $2)`
- **`sub_id` is always an empty string `''`, never `NULL`** — this is a critical recurring bug source. The DB stores `sub_id` as `''` for actions without a sub-identifier (e.g., action 1) and `'(a)'`/`'(b)'` for those with one. **Never coerce with `|| null` or `?? null`** — pass the value as-is. `IS NOT DISTINCT FROM` comparing `null` to `''` returns `false`, silently breaking queries. When extracting `sub_id` from URL params or regex matches, use `actionMatch[2] || ""` (fallback to empty string), not `actionMatch[2] || null`.
- Schema enums (e.g. `milestone_status`, `user_roles`, `risk_assessment`) mirror the TypeScript types in `src/types/index.ts`
- To add a DB feature: write the migration SQL in `sql/migrations/` and update `sql/schema/un80actions_schema.sql`. Run migrations manually via DataGrip, ensuring the correct database and schema are selected.

## Auth & Permissions

**Authentication flow**: `approved_users` table → email check → one-time token in `magic_tokens` → HMAC-signed session cookie (`auth_session`, 30 days). No third-party auth library.

**Two separate tables**:

- `approved_users` — pre-approval registry (email, `user_role`, `entity`, `user_status`). Admin-managed. Required to log in.
- `users` — created on first successful login (`id uuid`, `email`, `last_login_at`). Session cookie stores `users.id`.

`getCurrentUser()` joins both: returns `{ id, email, entity, user_role }`. Role comes from `approved_users`, resolved fresh on each request.

**Role hierarchy** (defined in `user_roles` enum):

- `Admin` / `Legal` — treated as admin-level; can see/edit everything including internal-only content
- `Principal`, `Support`, `Focal Point`, `Assistant` — non-admin; restricted write access, internal content hidden

**Permission helpers** in `features/auth/lib/permissions.ts`:

- `requireAdmin()` — returns `AdminCheckResult`; use in commands that only `Admin` or `Legal` may execute
- `checkIsAdmin()` — returns `boolean`; use for conditional query filtering (e.g. hiding `is_internal` updates)
- `requireWriteAccess(actionId, actionSubId)` — returns `WriteAccessResult` with `{ user: { id, email, isAdmin } }`; grants access to ranks 0–4 (Admin/Legal, WP leads, WP focal points, action leads, action focal points). Use for action-scoped write operations like milestone create/edit.
- `checkCanEditAction(actionId, actionSubId)` — returns `boolean`; UI helper wrapping `requireWriteAccess`

**Rank hierarchy** (6 assignment paths from user to action):
- **Rank 0**: Admin / Legal (via `approved_users.user_role`)
- **Rank 1**: WP lead (user → `approved_user_leads` → `work_package_leads` → `actions`)
- **Rank 2**: WP focal point (user → `work_package_focal_points` → `actions`)
- **Rank 3**: Action lead (user → `approved_user_leads` → `action_leads`)
- **Rank 4**: Action focal point (user → `action_focal_points`)
- **Rank 5–6**: Member/support persons — read-only, no write access

**Lead assignment**: Users can be linked to one or more leads via `approved_user_leads` (user_email → lead_name). Leads are associated with work packages and actions.

**PostgreSQL RLS**: Active on all 13 core tables. Policies defined in `sql/policies/rls_policies.sql`. Defense-in-depth: access control is enforced both in application-layer server actions (`requireAdmin`/`requireWriteAccess`) and at the DB level via RLS policies. All `commands.ts` write operations use `queryWithUser()` to set the RLS session context. Queries that JOIN through RLS-protected tables (e.g., checking write access via `actions` table) must also use `queryWithUser()`.

**Public milestone locking**: Non-admin users (ranks 1–4) cannot edit public milestones after submission (only `draft`/`rejected` status is editable). Enforced in both app layer (`updateMilestone` in `milestones/commands.ts`) and RLS (`017_public_milestone_lock.sql` WITH CHECK clause).

**Auth files**: `features/auth/service.ts` (tokens/sessions), `commands.ts` (orchestration), `mail.ts` (SMTP email), `lib/permissions.ts` (role helpers).

## Files & External Services

- File attachments: Azure Blob Storage — use `lib/blob-storage.ts` for all blob ops (`uploadBlob`, `deleteBlob`, `generateDownloadUrl`)
- Email: SMTP via `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`
- Python ETL in `python/` originally synced from Airtable to PostgreSQL — **do not re-run against production**. The database is live and has diverged from Airtable; upserts would overwrite user-entered data (milestones, notes, questions, updates, etc.).

## Key Commands

```bash
pnpm dev:local          # Dev server (local development)
pnpm dev                # Dev server on port 5000 (0.0.0.0) — Replit only
pnpm typecheck          # tsc --noEmit — also runs automatically as pre-commit hook
pnpm lint --fix
pnpm format

# Always use `uv run python` for Python scripts (never plain `python` or `python3`)
# ⚠️ Python ETL scripts are for reference only — do NOT run against the production DB
# uv run python python/misc/update_action_entities.py
```

## Connecting to the Database (CLI)

The `DATABASE_URL_APP` in `.env` includes `uselibpqcompat=true` which psql doesn't support. Strip it before connecting:

```bash
export $(grep -v '^#' .env | xargs)
DB_URL=$(echo "$DATABASE_URL_APP" | sed 's/&uselibpqcompat=true//')
psql "$DB_URL" -c "SELECT ..."
```

All app tables are in the `un80actions` schema. Use `un80actions.<table>` in queries, e.g.:

```bash
psql "$DB_URL" -c "\d un80actions.action_questions"
psql "$DB_URL" -c "SELECT id, header, question_date FROM un80actions.action_questions LIMIT 5;"
```

## Deployment

- **Production** is the `app` branch, deployed automatically via Vercel on every push
- API routes have a 10s function timeout (`vercel.json`)
- `output: "standalone"` in `next.config.ts` produces a self-contained build

## Environment Variables

Required: `DATABASE_URL_APP`, `AUTH_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM`, `SMTP_PASS`, `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_STORAGE_ACCOUNT_KEY`, `AZURE_STORAGE_CONTAINER_NAME`
Optional: `DATABASE_URL` (fallback if `DATABASE_URL_APP` not set), `DB_SCHEMA` (default: `un80actions`)

The PostgreSQL database is hosted on Azure. Database name: `un80actions`. All app tables live in the `un80actions` schema within that database.

## Critical Conventions

- **Tailwind v4.1 syntax only** — do not use v3 patterns (`@apply` with arbitrary values, `theme()` fn, etc.)
- **Single types file** — all shared types in `src/types/index.ts`; never scatter type definitions across features
- **Server components by default** — `"use client"` only for interactive/stateful UI leaves
- **shadcn**: `pnpm dlx shadcn@latest add <component>` to add; never edit `components/ui/` primitives directly
- **No parallel infrastructure** — reuse `query()`, `DB_SCHEMA`, `getCurrentUser()`, `blob-storage.ts`
- Check `src/lib/utils.ts` before writing new utility functions
- `ActionModal` in `features/actions/ui/` is the orchestrator for action detail; each tab (milestones, notes, questions, updates) is self-contained in its own feature folder

## Styling Conventions

Design language: **clean, modern, minimal**. When adding or editing UI, follow these principles:

- **Font**: Always use Roboto (loaded via `next/font/google`). Never introduce other typefaces.
- **Alignment**: Default to left-aligned text and elements; center-align only for standalone UI elements (e.g., empty states, icons). Maintain consistent, equal spacing between elements.
- **Visual hierarchy**: Use font weight, size, uppercase, and color to create clear information hierarchies. Respect margins — don't crowd elements but be concise.
- **Color**: UN Blue (`#009edb`, `--color-un-blue`) is the primary brand color.
- **Tailwind v4**: Use Tailwind utility classes. Custom theme tokens (e.g., `bg-un-blue`) are registered in `globals.css` under `@theme` and are available as Tailwind classes.
- **No focus rings**: Global CSS removes all focus outlines (`outline: none`) — do not re-introduce them.
