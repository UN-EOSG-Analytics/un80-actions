#!/bin/bash

# UN80 Actions Data Pipeline
# Fetches data from Airtable and loads into PostgreSQL
#
# With the "Recreate schema" step COMMENTED OUT (default), this script:
#   - UPDATES your DB from Airtable: leads, users, actions, milestones,
#     and seed notes/updates (action_notes/action_updates with user_id IS NULL).
#   - PRESERVES all user-created content: questions, notes, and legal comments
#     added in the app (pipeline never deletes those; notes step only replaces
#     seed notes/updates, not app-created ones).
#
# Optional "Recreate schema" step (commented out below):
#   - DROPS the entire un80actions schema and recreates it → DELETES everything.
#   - Use only for first-time setup or full reset. Then comment it back out.

set -e # Exit on error

echo "========================================"
echo "UN80 Actions Data Pipeline"
echo "========================================"
echo ""

# 1. Fetch leads from Airtable
echo "⏳ Step 1/8: Fetching leads from Airtable..."
uv run python python/tables/01-leads/01-fetch_leads.py
echo ""

# 2. Push leads to PostgreSQL
echo "⏳ Step 2/8: Loading leads into database..."
uv run python python/tables/01-leads/02-push_leads_postgres.py
echo ""

# 3. Fetch users from Airtable
echo "⏳ Step 3/8: Fetching users from Airtable..."
uv run python python/tables/02-users/01-fetch_users.py
echo ""

# 4. Push users to PostgreSQL
echo "⏳ Step 4/8: Loading users into database..."
uv run python python/tables/02-users/02-push_users_postgres.py
echo ""

# 5. Fetch and process actions from Airtable
echo "⏳ Step 5/8: Fetching and processing actions from Airtable..."
uv run python python/tables/03-actions/01-fetch_actions.py
uv run python python/tables/03-actions/02-process_actions.py
echo ""

# 6. Push actions to PostgreSQL
echo "⏳ Step 6/8: Loading actions into database..."
uv run python python/tables/03-actions/03-push_actions_postgres.py
echo ""

# 7. Extract and load milestones
echo "⏳ Step 7/8: Extracting and loading milestones..."
uv run python python/tables/04-milestones/populate_milestones.py
echo ""

# 8. Extract and load notes/updates
echo "⏳ Step 8/8: Extracting and loading notes/updates..."
uv run python python/tables/05-notes-updates/populate_notes_updates.py
echo ""

echo "========================================"
echo "✅ Pipeline completed successfully!"
echo "========================================"
