# UN80 Initiative Actions — Management Platform

## Overview
A full-stack Next.js application for managing UN80 Initiative work packages, milestones, actions, notes, questions, and legal comments. Authentication is via magic link email.

## Current Branch: `app-dev`

## Tech Stack
- **Framework**: Next.js 16 (standalone mode, full SSR)
- **Database**: Azure PostgreSQL (via `pg` pool, schemas: `un80actions` + `systemchart`)
- **Auth**: Magic link email (nodemailer / SMTP) + HMAC session tokens
- **File Storage**: Azure Blob Storage
- **Rich Text**: Tiptap editor
- **Styling**: Tailwind CSS v4 + Radix UI + shadcn/ui
- **Charts**: Recharts

## Project Structure
- `src/app/` — Next.js app router pages and API routes
- `src/features/` — Feature modules (actions, milestones, auth, notes, questions, legal-comments, attachments, activity, tags, updates)
- `src/lib/` — Shared utilities (db, blob-storage, utils)
- `src/proxy.ts` — Middleware for session-based auth gating
- `public/` — Static assets (images)
- `sql/schema/` — PostgreSQL schema definitions
- `python/` — Data processing scripts

## Required Environment Variables (set as Replit Secrets)
- `DATABASE_URL` — Azure PostgreSQL connection string (live data, handle carefully)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — For magic link emails
- `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_STORAGE_ACCOUNT_KEY`, `AZURE_STORAGE_CONTAINER_NAME` — File attachments
- `AUTH_SECRET` — HMAC secret for session token signing
- `DB_SCHEMA` — (optional) defaults to `un80actions`

## Development
- Runs on port 5000: `npm run dev` (configured with `-p 5000 -H 0.0.0.0`)
- `next.config.ts` reads `REPLIT_DEV_DOMAIN` to set `allowedDevOrigins`
- Auth is bypassed for `/login`, `/verify`, `/api/auth/*`

## Deployment
- Target: **autoscale** (standalone Next.js server)
- Build: `npm run build`
- Run: `node .next/standalone/server.js`
