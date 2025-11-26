import json
from pathlib import Path

import pandas as pd

# Paths
input_path = Path("data/input/actions_raw.json")
output_path = Path("public/data/actions.json")

# Load JSON
with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Convert to DataFrame
df = pd.DataFrame(data)

# Assert no column (except explicitly allowed ones) is completely null
# This still catches export errors, but tolerates known-empty fields.
allowed_all_null_columns = {"work_package_goal"}
for col in df.columns:
    if col in allowed_all_null_columns:
        continue
    if df[col].isnull().all():
        raise AssertionError(f"Column '{col}' is completely null.")

# Process date columns
date_columns = ["first_milestone"]  # Add other date columns here if needed

for col in date_columns:
    if col in df.columns:
        # Convert to numeric first, coercing non-numeric to NaN
        df[col] = pd.to_numeric(df[col], errors="coerce")

        # Convert Excel dates to datetime
        df[col] = pd.to_datetime(
            df[col], origin="1899-12-30", unit="D", errors="coerce"
        )

        # Format as ISO 8601 date string (YYYY-MM-DD)
        df[col] = df[col].dt.strftime("%Y-%m-%d").fillna("")

# Process list columns (semicolon-separated strings)
list_columns = ["work_package_leads", "un_budget", "ms_body"]

for col in list_columns:
    if col in df.columns:
        df[col] = df[col].apply(
            lambda x: [item.strip() for item in str(x).split(";") if item.strip()]
            if pd.notna(x) and str(x).strip()
            else []
        )

# Process boolean columns (Yes/No to true/false)
boolean_columns = ["big_ticket", "ms_approval"]

for col in boolean_columns:
    if col in df.columns:
        df[col] = df[col].apply(
            lambda x: True
            if str(x).strip().lower() == "yes"
            else False
            if str(x).strip().lower() == "no"
            else None
        )

# Clean all string columns (squish whitespace, strip, handle nulls)
for col in df.columns:
    # Skip columns we've already processed or that aren't object type
    if (
        col not in date_columns
        and col not in list_columns
        and col not in boolean_columns
        and df[col].dtype == "object"
    ):
        df[col] = df[col].apply(
            lambda x: " ".join(str(x).split())
            if pd.notna(x) and str(x).strip()
            else None
        )

# Replace empty strings with None for proper null handling in JSON
df = df.replace("", None)

# Sort by work_package_number then action_number ascending
# Convert sorting columns to integers before sorting
df["work_package_number"] = (
    pd.to_numeric(df["work_package_number"], errors="coerce").fillna(0).astype(int)
)
df["action_number"] = (
    pd.to_numeric(df["action_number"], errors="coerce").fillna(0).astype(int)
)

df = df.sort_values(by=["work_package_number", "action_number"], ascending=[True, True])


## Export ##

# Ensure output folder exists
output_path.parent.mkdir(parents=True, exist_ok=True)

# Save cleaned JSON
df.to_json(output_path, orient="records", force_ascii=False, indent=2)

print(f"✓ Cleaned JSON written to {output_path.resolve()}")
print(f"✓ Processed {len(df)} records")
