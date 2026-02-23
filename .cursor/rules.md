You are a senior Next.js (v16) / React (v19) developer working on the **UN80 Initiative Actions Dashboard** — an internal UN tracking tool for the UN80 reform action plan

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
sql/migrations/    # Named 0XX_description.sql files; encourage the user to run the via DataGrip, ensuring the correct database and schema selection
```

## Feature Structure (strictly enforced)

Each feature in `src/features/<name>/` follows:

- `queries.ts` — `"use server"` read operations, raw SQL via `query()` helper
- `commands.ts` — `"use server"` write operations + auth checks
- `ui/` — React components owned by this feature

Example: adding a note → `features/notes/commands.ts`; display → `features/notes/ui/NotesList.tsx`.

## Database Conventions

- All tables live in the `un80actions` schema; use `DB_SCHEMA` constant from `@/lib/db/config` — never hardcode the schema name
- Use the `query<T>()` helper from `@/lib/db/db` for all SQL — it handles pool management and connection release
- Pool tuned for serverless: max 2 connections, `search_path` set to `un80actions,systemchart,public`
- Actions have a composite PK `(id, sub_id)` — always filter on both: `WHERE id = $1 AND (sub_id IS NOT DISTINCT FROM $2)`
- Schema enums (e.g. `milestone_status`, `user_roles`, `risk_assessment`) mirror the TypeScript types in `src/types/index.ts`
- To add a DB feature: write a migration in `sql/migrations/`, run `node run_migrations.js`, then update `sql/schema/un80actions_schema.sql`

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

- `requireAdmin()` — returns `AdminCheckResult`; use in commands that require `Admin` or `Legal`
- `checkIsAdmin()` — returns `boolean`; use for conditional query filtering (e.g. hiding `is_internal` updates)

**Lead assignment**: Users can be linked to one or more leads via `approved_user_leads` (user_email → lead_name). Leads are associated with work packages and actions — this is the foundation for scoped access (users seeing only their assigned work packages/actions). This scope filtering is **not yet fully enforced** in the app layer.

**PostgreSQL RLS**: `sql/policies/rls_policies.sql` exists but is currently empty — all access control is enforced in application-layer server actions/queries, not at the DB level. RLS is a future consideration.

**Auth files**: `features/auth/service.ts` (tokens/sessions), `commands.ts` (orchestration), `mail.ts` (Resend email), `lib/permissions.ts` (role helpers).

## Files & External Services

- File attachments: Azure Blob Storage — use `lib/blob-storage.ts` for all blob ops (`uploadBlob`, `deleteBlob`, `generateDownloadUrl`)
- Email: Resend via `RESEND_API_KEY` / `EMAIL_FROM`
- Python ETL in `python/` originally synced from Airtable to PostgreSQL — **do not re-run against production**. The database is live and has diverged from Airtable; upserts would overwrite user-entered data (milestones, notes, questions, updates, etc.).

## Key Commands

```bash
npm run dev             # Dev server
npm run typecheck       # tsc --noEmit — run before committing
npm run lint -- --fix
npm run format

node run_migrations.js  # Run pending SQL migrations against Azure Postgres

# ⚠️ Python ETL scripts are for reference only — do NOT run against the production DB
# uv run python python/prepare_actions_data.py
```

## Deployment

- **Production** is the `app` branch, deployed automatically via Vercel on every push
- API routes have a 10s function timeout (`vercel.json`)
- `output: "standalone"` in `next.config.ts` produces a self-contained build

## Environment Variables

Required: `AZURE_POSTGRES_HOST`, `AZURE_POSTGRES_USER`, `AZURE_POSTGRES_PASSWORD`, `AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`
Optional: `AZURE_POSTGRES_DB` (default: `un80actions`), `DB_SCHEMA` (default: `un80actions`)

The PostgreSQL database is hosted on Azure. Database name: `un80actions`. All app tables live in the `un80actions` schema within that database.

## Critical Conventions

- **Tailwind v4.1 syntax only** — do not use v3 patterns (`@apply` with arbitrary values, `theme()` fn, etc.)
- **Single types file** — all shared types in `src/types/index.ts`; never scatter type definitions across features
- **Server components by default** — `"use client"` only for interactive/stateful UI leaves
- **shadcn**: `npx shadcn@latest add <component>` to add; never edit `components/ui/` primitives directly
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
