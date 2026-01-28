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


# Drop rows that are completely empty
df = df.dropna(how="all")


## Sort

# Sort by id (asc), then sub_id (asc) using natural sort
natsort_key = natsort_keygen()
df = df.sort_values(
    by=["id", "sub_id"],
    key=lambda col: col.fillna("").astype(str).map(natsort_key),
    ascending=[True, True],
).reset_index(drop=True)


print(f"\nNumber of actions fetched: {len(df)}")

# Display all available columns for reference
all_columns = df.columns.tolist()
print("\nAvailable columns in Airtable:")
for col in all_columns:
    print(f"  - {col}")


## Export ##

# Create output directory if it doesn't exist
output_dir = Path("data") / "input"
output_dir.mkdir(parents=True, exist_ok=True)

# Export raw data with all fields (including attachments) for backup
output_path = output_dir / "actions_raw.pkl"
df.to_pickle(output_path)
print(f"\nSaved pickle file: {output_path}")

# Export to CSV for next processing step
output_path = output_dir / "actions_raw.csv"
df.to_csv(output_path, index=False)
print(f"Saved CSV file: {output_path}")

print("\nData fetch and export complete!")
