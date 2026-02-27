## Project Overview

UN80 Actions Dashboard — a static Next.js site tracking UN80 Initiative work packages and action items. Data flows from Excel → Power Automate → GitHub → `public/data/actions.json` (daily refresh). The app is a **static export** (`output: 'export'` in `next.config.ts`), deployed to GitHub Pages with no server-side runtime.

## Architecture

- **Single data source**: `public/data/actions.json` is imported at build time in `src/lib/actions.ts` (direct JSON import, not `fetch`). Data is computed once on module load in `src/hooks/useActions.ts` — no loading states needed.
- **URL as state**: All filter state lives in URL search params (managed by `src/hooks/useFilters.ts`). Params use underscores for spaces, commas as array delimiters. Use `encodeUrlParam`/`decodeUrlParam` from `src/lib/utils.ts` when adding new params.
- **Modal state freeze**: When `ActionModal` is open, filters are frozen via `sessionStorage` (`actionModalOpen`, `actionModalReturnUrl`) so background state doesn't shift.
- **Data hierarchy**: `Action` (raw item from JSON) → grouped into `WorkPackage` (by `work_package_number`, spanning multiple reports) → displayed in `WorkPackageCard` → detail in `ActionModal`.
- **Workstreams**: `WS1`, `WS2`, `WS3`
- **Subactions**: `is_subaction: true` items are filtered out globally in `getActions()` except for `action_number` 94 and 95 (displayed under WP 31).

## Stack

- **Next.js 16** App Router, static export — no route handlers or server actions
- **Tailwind CSS v4.1** — syntax differs significantly from v3; always consult docs
- **shadcn/ui** — install via `npx shadcn@latest add <component>`; **never edit `src/components/ui/` directly**, create wrapper components instead. This applies unconditionally — no exceptions for styling fixes.

## Developer Commands

```bash
npm run dev        # local dev server
npm run build      # static export to /out
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run format     # Prettier
uv run python python/prepare_actions_data.py  # regenerate public/data/actions.json
```

## Conventions

### Colors

Use project brand colors as Tailwind classes defined in `src/app/globals.css` under `@theme inline`. Never use raw hex values inline.

- Primary brand: `un-blue` (#009edb) — links, active states, interactive elements
- Neutral text/UI: `trout` (#495057), `shuttle-gray` (#5a6c7d)
- Status colors come exclusively from `src/constants/actionStatus.ts` via `getStatusStyles(status)` — **amber** for "Further work ongoing", **green** for "Decision taken". Never hard-code amber/green for status outside this utility.

### Badges

All badge rendering must use the specialized wrappers in `src/components/Badges.tsx` — never construct ad-hoc badge markup. The visual hierarchy is:

| Component                              | Variant                             | Use for                      |
| -------------------------------------- | ----------------------------------- | ---------------------------- |
| `WPLeadsBadge`                         | `primary` — solid `un-blue`         | Work package leads           |
| `ActionLeadsBadge`                     | `secondary` — `un-blue` outline     | Action-level leads           |
| `TeamBadge`                            | `tertiary` — dashed, subtle         | Team members                 |
| `WorkstreamBadge` / `WorkstreamLabels` | `muted` — slate fill                | WS1/WS2/WS3 labels           |
| `DecisionStatusBadge`                  | amber / green via `getStatusStyles` | `public_action_status`       |
| `ShowMoreBadge`                        | dashed slate                        | Expand collapsed badge lists |

`LabelBadge` is the base component — use it only when no specific wrapper fits, passing the appropriate `BadgeVariant`. Badge items are auto-sorted via `naturalSort` and abbreviations resolved via `abbreviationMap`.

### Other

- **Type definitions**: All types in `src/types/index.ts`. `Action` fields use snake_case matching JSON keys.
- **Constants**: Document references in `src/constants/documents.ts`, abbreviated names in `src/constants/abbreviations.ts`.
- **No parallel infrastructure**: Prefer extending existing hooks/utils over creating new ones. No hardcoded values that belong in constants files.
- **Left-align layouts**, clear design hierarchy, no over-engineering.

## Key Files

| Path                              | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `src/lib/actions.ts`              | Data loading + filtering (entry point for data) |
| `src/lib/workPackages.ts`         | Groups actions into WorkPackage objects         |
| `src/hooks/useFilters.ts`         | All filter state (URL-driven)                   |
| `src/hooks/useWorkPackageData.ts` | Filtered/sorted work packages for display       |
| `src/components/ActionModal.tsx`  | Detail view for a single action                 |
| `src/constants/actionStatus.ts`   | Status constants + color palette                |
| `public/data/actions.json`        | Source of truth for all action data             |

## Python

- Always use `uv`: `uv add <package>`, `uv run python <script>`
- Data pipeline: `python/prepare_actions_data.py` → writes `public/data/actions.json`

## Before Making Changes

- Read `src/types/index.ts` to understand the data model
- Read `src/hooks/useFilters.ts` to understand URL param conventions before adding filters
- When brainstorming structural changes, propose options before implementing
