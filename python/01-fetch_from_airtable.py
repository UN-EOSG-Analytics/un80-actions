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

import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from pyairtable import Api

# Load environment variables from .env file
load_dotenv()

# Initialize Airtable API connection
api = Api(os.environ["AIRTABLE_API_KEY"])


BASE_ID = os.environ["AIRTABLE_BASE_ID"]
TABLE_ID = os.environ["AIRTABLE_TABLE_ID"]

# Fetch all records from the table
table = api.table(BASE_ID, TABLE_ID)
records = table.all()

if records:
    data = [record["fields"] for record in records]
    df = pd.DataFrame(data)
else:
    raise ValueError("No records found in Airtable table")

# Drop rows that are completely empty
df = df.dropna(how="all")

# Sanity check: ensure we have a reasonable number of actions
if len(df) < 1:
    raise ValueError(f"\nExpected at least 1 record, but got {len(df)}")

print(f"\nNumber of actions fetched: {len(df)}")

# Check for duplicate actions (data integrity validation)
if "Action ID" in df.columns:
    duplicates_mask = df["Action ID"].duplicated(keep=False)
    if duplicates_mask.any():
        duplicate_rows = df[duplicates_mask][["Action ID"]].drop_duplicates()
        duplicates_info = duplicate_rows.to_string(index=False)
        raise ValueError(
            f"Duplicate actions found in the input data:\n{duplicates_info}"
        )
    else:
        print("\nAll action IDs are unique.")

print(f"\nNumber of actions to process: {df.shape[0]}")

# Display all available columns for reference
all_columns = df.columns.tolist()
print("\nAvailable columns in Airtable:")
for col in all_columns:
    print(f"  - {col}")

# TODO: Define selected columns based on your Airtable structure
# Uncomment and modify once you've confirmed the exact field names
# selected_columns = [
#     "Action ID",
#     "Sub-Action",
#     "Work Package",
#     "Workstream",
#     "Indicative Activity",
#     "Status",
#     "Leads",
#     "Responsible Entities",
#     "Document Paragraph",
#     "Big Ticket",
#     "Milestones",
#     # Add other relevant fields
# ]

# For now, export all columns
selected_columns = all_columns
df = df[selected_columns]

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
