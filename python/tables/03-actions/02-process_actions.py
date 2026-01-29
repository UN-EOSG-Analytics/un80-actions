"""
Process actions data for database insertion.

This script:
1. Loads raw actions data from parquet
2. Converts linked columns (emails, leads, entities) to proper lists
3. Validates and cleans data
4. Exports processed data ready for database upsert

Usage:
    uv run python python/tables/03-actions/02-process_actions.py
"""

from pathlib import Path

import pandas as pd
from python.utils.utils import convert_linked_columns_to_lists, export_dataframe

input_path = Path("data") / "input" / "actions_raw.parquet"
df = pd.read_parquet(input_path)

print(f"\nLoaded {len(df)} actions.\n")

##################################################################
# Convert linked columns to lists
##################################################################

linked_columns = [
    "work_package_leads",
    "work_package_focal_points",
    "action_leads",
    "action_focal_points",
    "action_member_persons",
    "action_support_persons",
    "action_member_entities",
]

df = convert_linked_columns_to_lists(df, linked_columns)

##################################################################
# Data validation and cleaning
##################################################################

# Ensure id and sub_id are present
assert "id" in df.columns, "Missing 'id' column"
assert "sub_id" in df.columns, "Missing 'sub_id' column"

# Convert empty sub_id to None (NULL in database)
df["sub_id"] = df["sub_id"].apply(lambda x: None if pd.isna(x) or x == "" else x)

# Ensure work_package_id is integer where not null
df["work_package_id"] = pd.to_numeric(df["work_package_id"], errors="coerce")

# Convert date columns to datetime
date_columns = [
    "milestone_1_deadline",
    "milestone_2_deadline",
    "milestone_3_deadline",
    "milestone_upcoming_deadline",
    "milestone_final_deadline",
]

for col in date_columns:
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors="coerce")

# Convert boolean columns
bool_columns = ["is_big_ticket", "needs_member_state_engagement"]
for col in bool_columns:
    if col in df.columns:
        # Handle various representations of boolean
        df[col] = (
            df[col]
            .map(
                {
                    True: True,
                    "True": True,
                    "true": True,
                    "1": True,
                    False: False,
                    "False": False,
                    "false": False,
                    "0": False,
                    None: False,
                    "": False,
                }
            )
            .fillna(False)
        )

# Validate linked columns are lists
for col in linked_columns:
    if col in df.columns:
        # Ensure all values are either lists or None
        df[col] = df[col].apply(lambda x: x if isinstance(x, list) else [])

print("Data validation complete")
print(f"  - {len(df)} actions")
print(f"  - {df['work_package_id'].nunique()} unique work packages")
print(f"  - {df['workstream_id'].nunique()} unique workstreams")

##################################################################
# Export
##################################################################

output_dir = Path("data") / "processed"
export_dataframe(df, "actions", output_dir)

print("\nData processing complete!")
