#!/bin/bash

# UN80 Actions Data Pipeline
# Fetches data from Airtable and loads into PostgreSQL

set -e # Exit on error

echo "========================================"
echo "UN80 Actions Data Pipeline"
echo "========================================"
echo ""

# 1. Recreate schema (optional - comment out if you want to preserve existing data)
echo "⏳ Step 1/7: Recreating database schema..."
uv run python python/db/recreate_schema.py
echo ""

# 2. Fetch leads from Airtable
echo "⏳ Step 2/7: Fetching leads from Airtable..."
uv run python python/tables/01-leads/01-fetch_leads.py
echo ""

# 3. Push leads to PostgreSQL
echo "⏳ Step 3/7: Loading leads into database..."
uv run python python/tables/01-leads/02-push_leads_postgres.py
echo ""

# 4. Fetch users from Airtable
echo "⏳ Step 4/7: Fetching users from Airtable..."
uv run python python/tables/02-users/01-fetch_users.py
echo ""

# 5. Push users to PostgreSQL
echo "⏳ Step 5/7: Loading users into database..."
uv run python python/tables/02-users/02-push_users_postgres.py
echo ""

# 6. Fetch and process actions from Airtable
echo "⏳ Step 6/7: Fetching and processing actions from Airtable..."
uv run python python/tables/03-actions/01-fetch_actions.py
uv run python python/tables/03-actions/02-process_actions.py
echo ""

# 7. Push actions to PostgreSQL
echo "⏳ Step 7/7: Loading actions into database..."
uv run python python/tables/03-actions/03-push_actions_postgres.py
echo ""

echo "========================================"
echo "✅ Pipeline completed successfully!"
echo "========================================"
