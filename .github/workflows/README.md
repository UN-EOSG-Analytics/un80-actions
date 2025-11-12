# GitHub Actions Workflows

This directory contains the GitHub Actions workflows for the UN80 Actions project.

## Workflows

### `process_data.yml` - Process raw JSON data

**Triggers:**
- Manual dispatch via GitHub Actions UI
- Push to `main` branch (only if commit message contains "automated data update")

**Purpose:**
- Processes raw data files using Python scripts
- Commits processed data back to the repository with message: "chore: automated data processing [GitHub Actions]"

**Flow:**
1. Checks out the repository
2. Sets up Python environment with `uv`
3. Runs `python/prepare_data.py` to process data
4. Commits and pushes changes (if any)

**Important:** This workflow only runs on pushes that contain "automated data update" in the commit message. This is triggered by Power Automate's daily push of `data/input/actions_raw.json` via the GitHub REST API. The workflow prevents running on its own commits (which use a different message) to avoid infinite loops.

---

### `nextjs.yml` - Deploy Next.js to GitHub Pages

**Triggers:**
- Push to `main` branch (except those with "automated data update" message)
- Sucessful completion of "Process raw JSON data" workflow
- Manual dispatch via GitHub Actions UI

**Purpose:**
- Builds the Next.js application
- Deploys the static site to GitHub Pages

**Flow:**
1. Checks out the repository
2. Installs Node.js dependencies
3. Builds the Next.js application with static export
4. Uploads and deploys to GitHub Pages

**Conditional Logic:**
- **Skips** if triggered by a push with "automated data update" in the commit message (waits for `process_data.yml` to complete instead)
- **Runs** if:
  - Manually dispatched, OR
  - Triggered by `process_data.yml` workflow completion (and it succeeded), OR
  - Triggered by a push without "automated data update" in the message

---

## Complete Flow

### When data is updated (daily automated flow):

1. **Power Automate** pushes `data/input/actions_raw.json` via GitHub REST API with commit message containing "automated data update" (runs daily)
2. **`process_data.yml`** is triggered and runs to process the raw data
3. **`process_data.yml`** commits processed data to `public/data/actions.json` with message "chore: automated data processing [GitHub Actions]"
4. **`nextjs.yml`** is triggered by the workflow_run event (after `process_data.yml` completes successfully) and deploys the updated site

### When code is updated:

1. **Developer** pushes code changes (without "automated data update" message)
2. **`nextjs.yml`** runs directly and deploys the updated site
3. **`process_data.yml`** does not run

### Manual triggers:

Both workflows can be triggered manually from the GitHub Actions UI for testing or on-demand updates.
