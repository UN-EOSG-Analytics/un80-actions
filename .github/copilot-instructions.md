# UN80 Actions Workspace Instructions

Canonical workspace instructions for AI coding agents. Keep this file as the single project-wide source of truth.

## Project Scope

- Internal UN80 dashboard built with Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui, and PostgreSQL via `pg`.
- The app tracks workstreams, work packages, actions, milestones, notes, questions, updates, and attachments.
- Authentication is custom magic-link auth. There is no third-party auth library.

## Before Coding

- Before any Next.js work, read the relevant docs in `node_modules/next/dist/docs/`. Do not rely on model memory for framework behavior.
- Prefer existing project patterns over generic Next.js patterns. This repo is feature-oriented and database-heavy.
- Link to existing docs instead of copying them into new instruction files or docs.

## Build And Validation

- Use `pnpm dev:local` for normal local development.
- Use `pnpm dev` only for the Replit-style port 5000 workflow.
- There is currently no automated test runner configured.

## Architecture

- Keep routing thin in `src/app/`; put domain logic in `src/features/`.
- Each feature follows the same structure:
	- `queries.ts`: server-side reads
	- `commands.ts`: server-side writes and auth checks
	- `ui/`: feature-owned components
- `ActionModal` in `src/features/actions/ui/` is the orchestrator for action detail. Milestones, notes, questions, updates, and similar tabs stay self-contained in their own feature folders.
- Do not edit `src/components/ui/` primitives directly.
- Shared types belong in `src/types/index.ts`.

## Data And Auth Rules

- Use `query<T>()` from `src/lib/db/db.ts` for all SQL. Do not introduce parallel database access helpers.
- Use `DB_SCHEMA` from `src/lib/db/config`. Do not hardcode `un80actions` in app queries.
- Actions use the composite key `(id, sub_id)`. Always filter both values with `WHERE id = $1 AND (sub_id IS NOT DISTINCT FROM $2)`.
- The database pool is intentionally small and PgBouncer-backed. Do not bypass the query helper or hold connections across async work.
- Auth and authorization are enforced in the app layer. Reuse `getCurrentUser()`, `requireAdmin()`, and `checkIsAdmin()`.
- `Admin` and `Legal` are admin-level roles. Non-admin roles must not gain access to internal-only content.

## External Services

- Use `src/lib/blob-storage.ts` for all Azure Blob Storage operations.
- Use the existing auth mail flow in `src/features/auth/` for magic-link email behavior.
- Do not run the Python ETL scripts against production data. They are reference-only because the live database has diverged from Airtable.

## UI Conventions

- Server components are the default. Add `"use client"` only for interactive leaves.
- Tailwind v4 syntax only. Do not introduce old Tailwind v3 patterns.
- Use Roboto from `next/font/google` and preserve the existing UN visual language.
- Prefer the existing UN Blue theme tokens and the project’s current spacing and hierarchy patterns.
- Global CSS intentionally removes focus outlines. Do not reintroduce focus rings unless the project explicitly changes that decision.

## Key References

- Architecture and conventions: `src/features/actions/README.md`, `src/features/auth/README.md`, `src/features/attachments/README.md`
- Database schema: `sql/schema/un80actions_schema.sql`
- Known schema concerns: `docs/DB_REVIEW.md`
- Replit-specific environment notes: `replit.md`
- Deployment-related config: `next.config.ts`, `vercel.json`
