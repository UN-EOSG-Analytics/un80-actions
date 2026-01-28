"""
Process UN80 Actions data from Airtable export.

This script:
1. Loads action data from CSV (fetched from Airtable)
2. Parses and normalizes data fields
3. Handles linked records (Leads, Entities, Milestones)
4. Exports processed data to CSV and JSON formats

The JSON output is used by the Next.js frontend for the dashboard.
"""

import ast
from pathlib import Path

import pandas as pd

# Load data from csv file (fetched from Airtable)
input_path = Path("data") / "input" / "actions_raw.csv"
df = pd.read_csv(input_path)

print(f"\nLoaded {len(df)} actions from Airtable")
print(f"Columns: {list(df.columns)}")

# Wrangle ------------------------------------------------------

# Sort by action ID
if "Action ID" in df.columns:
    df = df.sort_values("Action ID")

# Parse linked fields from string representation to lists
# Airtable exports arrays as string literals like "['Lead 1', 'Lead 2']"
linked_fields = [col for col in df.columns if col in [
    "Leads", "Responsible Entities", "Milestones", "Related Documents"
]]

for field in linked_fields:
    if field in df.columns:
        df[field] = df[field].astype(str)
        df[field] = df[field].apply(
            lambda x: ast.literal_eval(x)
            if x.startswith("[") and x.endswith("]")
            else None
            if x == "nan"
            else [x]
        )
        print(f"Parsed {field} field")

# Fill missing values with appropriate defaults
df = df.fillna({
    "Status": "Further work ongoing",
    "Big Ticket": False,
})

# Data validation
print("\nData validation:")
print(f"  - Total actions: {len(df)}")
if "Action ID" in df.columns:
    print(f"  - Unique Action IDs: {df['Action ID'].nunique()}")
if "Workstream" in df.columns:
    print(f"  - Workstreams: {df['Workstream'].unique().tolist()}")
if "Status" in df.columns:
    print(f"  - Status distribution:\n{df['Status'].value_counts().to_string()}")

# Export ------------------------------------------------------

# Create output directory if needed
output_dir = Path("data") / "output"
output_dir.mkdir(parents=True, exist_ok=True)

# Export to data directory (for reference)
output_path = output_dir / "actions.csv"
df.to_csv(output_path, index=False)
print(f"\nExported to: {output_path}")

# Export to public directory (for Next.js static site)
public_dir = Path("public") / "data"
public_dir.mkdir(parents=True, exist_ok=True)

output_path = public_dir / "actions.csv"
df.to_csv(output_path, index=False)
print(f"Exported to: {output_path}")

# JSON export (primary format for Next.js import)
output_path = public_dir / "actions.json"
df.to_json(output_path, orient="records", indent=2)
print(f"Exported to: {output_path}")

print("\nData processing complete!")
