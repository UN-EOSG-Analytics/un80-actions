"""
Fetch UN80 Actions data from Airtable.

This script:
1. Connects to Airtable using API credentials from .env or Github Actions Secrets
2. Fetches all records from the specified base and table
3. Validates data quality (checks for duplicates, missing fields)
4. Selects relevant columns for processing
5. Exports raw data to CSV and pickle formats

Environment variables required:
- AIRTABLE_API_KEY: API token from https://airtable.com/create/tokens
- AIRTABLE_BASE_ID: The base ID containing action data
- AIRTABLE_TABLE_ID: The table ID within the base

The output CSV is consumed by 02-process_actions_data.py for further processing.
"""

from pathlib import Path

import pandas as pd
from api.airtable import fetch_airtable_table
from natsort import natsort_keygen

ACTIONS_TABLE_ID = "tblizWEdO7EsfFGlz"

df = fetch_airtable_table(table_id=ACTIONS_TABLE_ID)


# Sanity check: ensure we have the correct number of actions
assert len(df) == 91, f"Expected exactly 91 records, but got {len(df)}"
print(f"\nNumber of actions fetched: {len(df)}")

# Drop rows that are completely empty
df = df.dropna(how="all")

# Drop all columns that include "SUPERSEDED" (case-insensitive)
df = df.loc[:, ~df.columns.str.contains("SUPERSEDED", case=False)]

# Sort by id (asc), then sub_id (asc) using natural sort
natsort_key = natsort_keygen()
df = df.sort_values(
    by=["id", "sub_id"],
    key=lambda col: col.fillna("").astype(str).map(natsort_key),
    ascending=[True, True],
).reset_index(drop=True)


# Display all available columns for reference

# Sort columns alphabetically
# Keep 'id' and 'sub_id' first, then sort the rest alphabetically
# Define columns to keep first, rest sorted alphabetically after
first = ["id", "sub_id"]
df = df[[*first, *sorted(c for c in df.columns if c not in first)]]

all_columns = df.columns.tolist()
print("\nAvailable columns in Airtable:")
for col in all_columns:
    print(f"  - {col}")


## Select Vars

selected_columns = [
    "id",
    "sub_id",
    # "Work Package Deliverables",
    "action_focal_points",
    "action_leads",
    "action_member_persons",
    "action_notes",
    "action_record_id",
    "action_support_persons",
    "action_updates",
    "document_paragraph_number",
    "document_paragraph_text",
    "indicative_action",
    # "intergovernmental_bodies -- TBD",
    "is_big_ticket",
    "legal_considerations",
    "milestone_1",
    "milestone_1_deadline",
    "milestone_2",
    "milestone_2_deadline",
    "milestone_3",
    "milestone_3_deadline",
    "milestone_final_deadline",
    "milestone_upcoming",
    "milestone_upcoming_deadline",
    "miletstone_final",
    "needs_member_state_engagement",
    "proposal_advancement_scenario",
    "public_action_status",
    "scope_definition",
    "sub_action",
    "tracking_status",
    "un_budgets",
    "work_package_focal_points",
    "work_package_goal",
    "work_package_id",
    "work_package_leads",
    "work_package_title",
    "workstream_id",
]

df = df[[col for col in selected_columns if col in df.columns]]


## Export ##

# Create output directory if it doesn't exist
output_dir = Path("data") / "input"
output_dir.mkdir(parents=True, exist_ok=True)

# Export raw data with all fields (including attachments) for backup
output_path = output_dir / "actions_raw.parquet"
df.to_parquet(output_path)

print(f"\nSaved parquet file to: {output_path}")

# Export to CSV for next processing step
output_path = output_dir / "actions_raw.csv"
df.to_csv(output_path, index=False)
print(f"Saved CSV file to: {output_path}")

print("\nData fetch and export complete!")
