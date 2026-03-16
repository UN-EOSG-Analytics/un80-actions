# UN80 Initiative Actions — Management Platform

## Overview
A full-stack Next.js application for managing UN80 Initiative work packages, milestones, actions, notes, questions, and legal comments. Authentication is via magic link email.

## Current Branch: `app-dev`

## Tech Stack
- **Framework**: Next.js 16 (standalone mode, full SSR)
- **Package Manager**: pnpm (v10+)
- **Database**: Azure PostgreSQL (via `pg` pool, PgBouncer on port 6432)
- **Auth**: Magic link email (nodemailer / SMTP) + HMAC session tokens (`AUTH_SECRET`)
- **File Storage**: Azure Blob Storage
- **Rich Text**: Tiptap editor
- **Styling**: Tailwind CSS v4 + Radix UI + shadcn/ui
- **Charts**: Recharts

## Project Structure
- `src/app/` — Next.js app router pages and API routes
- `src/features/` — Feature modules (actions, milestones, auth, notes, questions, legal-comments, attachments, activity, tags, updates)
- `src/lib/` — Shared utilities (db, blob-storage, utils)
- `src/proxy.ts` — Middleware for session-based auth gating
- `public/` — Static assets
- `sql/schema/` — PostgreSQL schema definitions
- `python/` — Data processing scripts

## Environment Variables
All secrets live in `.env` (gitignored). Key variables:

- `APP_DATABASE_URL` — Azure PostgreSQL connection string (**use this, not `DATABASE_URL`** — Replit injects its own `DATABASE_URL` for its local Postgres, which would override `.env`)
- `AUTH_SECRET` — HMAC secret for session token signing (`openssl rand -base64 32`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — Magic link email
- `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_STORAGE_ACCOUNT_KEY`, `AZURE_STORAGE_CONTAINER_NAME` — File attachments
- `DEV_LOGIN_EMAIL` — (development only) Email for one-click dev login bypass
- `DB_SCHEMA` — (optional) defaults to `un80actions`

## Development
- **Start**: `pnpm dev` (port 5000, host 0.0.0.0)
- **Workflow command**: `pnpm install && pnpm dev`
- `next.config.ts` reads `REPLIT_DEV_DOMAIN` to set `allowedDevOrigins` for iframe preview
- Session cookies use `SameSite=None; Secure` so they work inside the Replit preview iframe
- A **Dev Login** button appears on `/login` in development when `DEV_LOGIN_EMAIL` is set — one click, no email needed. Guarded server-side: throws if `NODE_ENV !== "development"`

## Deployment
- Target: **autoscale** (standalone Next.js server)
- Build: `pnpm build`
- Run: `node .next/standalone/server.js`
