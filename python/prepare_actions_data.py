import json
from datetime import datetime, timezone
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

print(f"\nLoaded {len(df)} records from {input_path}")
assert len(df) == 91

# Replace empty strings with None for proper null handling
df = df.replace("", None)

# Remove empty rows (rows where all values are NaN or None)
df = df.dropna(how="all")

# Assert no column is completely null (indicates error on Power Automate export)
for col in df.columns:
    if df[col].isnull().all():
        raise AssertionError(
            f"Power Automate Issue: Column '{col}' is completely null."
        )

##############################################################################

# Process date columns
date_columns = [
    "first_milestone_deadline",
    "final_milestone_deadline",
    "delivery_date",
]  # Add other date columns here if needed

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
list_columns = ["work_package_leads", "action_leads", "un_budget", "ms_body"]

for col in list_columns:
    if col in df.columns:
        df[col] = df[col].apply(
            lambda x: [item.strip() for item in str(x).split(";") if item.strip()]
            if pd.notna(x) and str(x).strip()
            else []
        )

# Process boolean columns (Yes/No to true/false)
boolean_columns = ["big_ticket"]

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

##############################################################################

## Data Validation ##


# Identify subactions (actions that should not be displayed on dashboard)
# Subactions are duplicate entries with the same action_number, work_package_number, and report
# We keep the first occurrence (or one with document_paragraph if any has it) and mark others as subactions
# IMPORTANT: This must be done BEFORE sorting to preserve the original order within each action group
def identify_subactions(df):
    df = df.copy()
    df["is_subaction"] = False

    # Group by action_number, work_package_number, and report
    grouped = df.groupby(["action_number", "work_package_number", "report"])

    for (action_num, wp_num, report), group in grouped:
        if len(group) > 1:
            # Multiple entries for the same action - identify which ones are subactions
            # Priority: keep entries with document_paragraph, then keep first occurrence (by original index order)
            group_indices = group.index.tolist()

            # Check if any have document_paragraph
            has_doc_para = group["document_paragraph"].notna() & (
                group["document_paragraph"].astype(str).str.strip() != ""
            )

            if has_doc_para.any():
                # Keep entries with document_paragraph, mark others as subactions
                keep_indices = group[has_doc_para].index.tolist()
                subaction_indices = [
                    idx for idx in group_indices if idx not in keep_indices
                ]
            else:
                # No document_paragraph in any - keep first (by original index order), mark rest as subactions
                keep_index = group_indices[0]
                subaction_indices = group_indices[1:]

            # Mark subactions
            df.loc[subaction_indices, "is_subaction"] = True

    return df["is_subaction"]


# Add is_subaction column BEFORE sorting to preserve original order
df["is_subaction"] = identify_subactions(df)

# Sort by work_package_number then action_number ascending
# Convert sorting columns to integers before sorting
df["work_package_number"] = (
    pd.to_numeric(df["work_package_number"], errors="coerce").fillna(0).astype(int)
)
df["action_number"] = (
    pd.to_numeric(df["action_number"], errors="coerce").fillna(0).astype(int)
)

df = df.sort_values(by=["work_package_number", "action_number"], ascending=[True, True])

# Debug: Print subaction detection results
num_subactions = df["is_subaction"].sum()
print(
    f"\n📊 Subaction detection: {num_subactions} subactions found out of {len(df)} total actions"
)

# If we didn't detect exactly 5 subactions, show which ones were detected for debugging
if num_subactions != 5:
    print(f"⚠️  Warning: Expected 5 subactions but detected {num_subactions}")
    if num_subactions > 0:
        print("Detected subactions:")
        subactions = df[df["is_subaction"]]
        for idx, row in subactions.iterrows():
            print(
                f"  - Action {row['action_number']} in WP {row['work_package_number']} ({row['report']})"
            )

# Expected counts from UI DataCards (excluding subactions)
EXPECTED_WORKSTREAMS = 3
EXPECTED_WORK_PACKAGES = 31
EXPECTED_ACTIONS = 86  # 91 total - 5 subactions
EXPECTED_LEADS = 34

# Calculate actual counts (excluding subactions for actions count)
df_non_subactions = df[~df["is_subaction"]]
actual_workstreams = df["report"].nunique()
actual_work_packages = df["work_package_number"].nunique()
actual_actions = len(df_non_subactions)  # Count only non-subactions
actual_leads = df["work_package_leads"].explode().nunique()

# Validate counts
validation_errors = []

if actual_workstreams != EXPECTED_WORKSTREAMS:
    validation_errors.append(
        f"Workstreams count mismatch! Expected {EXPECTED_WORKSTREAMS}, got {actual_workstreams}"
    )

if actual_work_packages != EXPECTED_WORK_PACKAGES:
    validation_errors.append(
        f"Work Packages count mismatch! Expected {EXPECTED_WORK_PACKAGES}, got {actual_work_packages}"
    )

if actual_actions != EXPECTED_ACTIONS:
    validation_errors.append(
        f"Actions count mismatch! Expected {EXPECTED_ACTIONS}, got {actual_actions}"
    )

if actual_leads != EXPECTED_LEADS:
    validation_errors.append(
        f"UN System Leaders count mismatch! Expected {EXPECTED_LEADS}, got {actual_leads}"
    )

# Raise error if validation fails
if validation_errors:
    error_message = "\n" + "=" * 60 + "\n"
    error_message += "DATA VALIDATION FAILED\n"
    error_message += "=" * 60 + "\n"
    for error in validation_errors:
        error_message += f"❌ {error}\n"
    error_message += "=" * 60
    raise AssertionError(error_message)

print("\n✓ All data counts match expected values")

##############################################################################

## Export ##

# Ensure output folder exists
output_path.parent.mkdir(parents=True, exist_ok=True)

# Save cleaned JSON
df.to_json(output_path, orient="records", force_ascii=False, indent=2)

# Write last-updated timestamp for the dashboard header
last_updated_path = output_path.parent / "last-updated.json"
last_updated_path.write_text(
    json.dumps({"lastUpdated": datetime.now(timezone.utc).isoformat()}),
    encoding="utf-8",
)
print(f"✓ Last updated written to {last_updated_path.resolve()}")

print(f"✓ Cleaned JSON written to {output_path.resolve()}")
print(
    f"✓ Processed {len(df)} records ({len(df_non_subactions)} actions, {df['is_subaction'].sum()} subactions)"
)
