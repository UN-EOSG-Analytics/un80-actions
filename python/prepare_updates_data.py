import json
from pathlib import Path

import pandas as pd

# Paths
updates_input_path = Path("data/input/actions_updates_raw.json")
actions_output_path = Path("public/data/actions.json")

# Load updates JSON
with open(updates_input_path, "r", encoding="utf-8") as f:
    updates_data = json.load(f)

# Convert to DataFrame
updates_df = pd.DataFrame(updates_data)

# Replace empty strings with None for proper null handling
updates_df = updates_df.replace("", None)

# Remove empty rows (rows where all values are NaN or None)
updates_df = updates_df.dropna(how="all")

# Convert action_number to integer for matching
updates_df["action_number"] = pd.to_numeric(
    updates_df["action_number"], errors="coerce"
).fillna(0).astype(int)

# Process delivery_date column (Excel date format)
if "delivery_date" in updates_df.columns:
    # Replace empty strings and "0" with None first
    updates_df["delivery_date"] = updates_df["delivery_date"].replace("", None)
    updates_df["delivery_date"] = updates_df["delivery_date"].replace("0", None)
    
    # Convert to numeric first, coercing non-numeric to NaN
    updates_df["delivery_date"] = pd.to_numeric(
        updates_df["delivery_date"], errors="coerce"
    )
    
    # Set 0 and negative values to None before date conversion
    updates_df.loc[updates_df["delivery_date"] <= 0, "delivery_date"] = None
    
    # Convert Excel dates to datetime
    updates_df["delivery_date"] = pd.to_datetime(
        updates_df["delivery_date"], origin="1899-12-30", unit="D", errors="coerce"
    )
    
    # Format as ISO 8601 date string (YYYY-MM-DD)
    updates_df["delivery_date"] = updates_df["delivery_date"].dt.strftime("%Y-%m-%d")
    
    # Replace invalid dates (NaT) and empty strings with None
    updates_df["delivery_date"] = updates_df["delivery_date"].replace("NaT", None)
    updates_df["delivery_date"] = updates_df["delivery_date"].replace("", None)

# Clean string columns (upcoming_milestone, updates, and link_updates)
string_columns = ["upcoming_milestone", "updates", "link_updates"]

for col in string_columns:
    if col in updates_df.columns:
        updates_df[col] = updates_df[col].apply(
            lambda x: " ".join(str(x).split())
            if pd.notna(x) and str(x).strip()
            else None
        )

# Replace empty strings with None for proper null handling in JSON
updates_df = updates_df.replace("", None)

# Load existing actions JSON
with open(actions_output_path, "r", encoding="utf-8") as f:
    actions_data = json.load(f)

# Convert actions to DataFrame for easier manipulation
actions_df = pd.DataFrame(actions_data)

# Ensure action_number is integer for matching
actions_df["action_number"] = pd.to_numeric(
    actions_df["action_number"], errors="coerce"
).fillna(0).astype(int)

# Check for duplicate action numbers
duplicate_actions = updates_df[updates_df.duplicated(subset=["action_number"], keep=False)]
if len(duplicate_actions) > 0:
    print(f"⚠️  Warning: Found {len(duplicate_actions)} duplicate action numbers in updates file:")
    for action_num in duplicate_actions["action_number"].unique():
        print(f"  - Action {action_num} appears {len(duplicate_actions[duplicate_actions['action_number'] == action_num])} times")
    print("  Using the last occurrence for each duplicate.")

# Create a mapping from action_number to update fields
# If there are duplicates, keep the last one (using drop_duplicates with keep='last')
updates_df_unique = updates_df.drop_duplicates(subset=["action_number"], keep="last")
updates_dict = {}
for _, row in updates_df_unique.iterrows():
    action_num = int(row["action_number"])
    updates_dict[action_num] = {
        "upcoming_milestone": row.get("upcoming_milestone"),
        "delivery_date": row.get("delivery_date"),
        "updates": row.get("updates"),
        "link_updates": row.get("link_updates"),
    }

# Ensure the new fields exist in actions_df (initialize with None if they don't)
if "upcoming_milestone" not in actions_df.columns:
    actions_df["upcoming_milestone"] = None
if "upcoming_milestone_deadline" not in actions_df.columns:
    actions_df["upcoming_milestone_deadline"] = None
if "updates" not in actions_df.columns:
    actions_df["updates"] = None
if "link_updates" not in actions_df.columns:
    actions_df["link_updates"] = None

# Merge updates into actions
merged_count = 0
for idx, action in actions_df.iterrows():
    action_num = int(action["action_number"])
    if action_num in updates_dict:
        update_data = updates_dict[action_num]
        
        # Only update fields that are not None in the updates data
        # Use upcoming_milestone if provided, otherwise keep existing final_milestone
        if update_data["upcoming_milestone"] is not None and str(update_data["upcoming_milestone"]).strip():
            actions_df.at[idx, "upcoming_milestone"] = update_data["upcoming_milestone"]
        
        # Map delivery_date to upcoming_milestone_deadline
        if update_data["delivery_date"] is not None and str(update_data["delivery_date"]).strip():
            actions_df.at[idx, "upcoming_milestone_deadline"] = update_data["delivery_date"]
        
        # Add updates field
        if update_data["updates"] is not None and str(update_data["updates"]).strip():
            actions_df.at[idx, "updates"] = update_data["updates"]
        
        # Add link_updates field
        if update_data["link_updates"] is not None and str(update_data["link_updates"]).strip():
            actions_df.at[idx, "link_updates"] = update_data["link_updates"]
        
        merged_count += 1

print(f"\n✓ Merged updates for {merged_count} actions")

# Check for actions in updates that don't exist in actions
unmatched_actions = set(updates_dict.keys()) - set(actions_df["action_number"].unique())
if unmatched_actions:
    print(f"⚠️  Warning: Found {len(unmatched_actions)} action numbers in updates that don't exist in actions.json:")
    for action_num in sorted(unmatched_actions):
        print(f"  - Action {action_num}")

# Replace NaN values with None before converting to dict
actions_df = actions_df.where(pd.notna(actions_df), None)

# Convert back to list of dictionaries
actions_list = actions_df.to_dict("records")

# Save updated JSON
actions_output_path.parent.mkdir(parents=True, exist_ok=True)
with open(actions_output_path, "w", encoding="utf-8") as f:
    json.dump(actions_list, f, ensure_ascii=False, indent=2)

print(f"✓ Updated actions.json written to {actions_output_path.resolve()}")
print(f"✓ Processed {len(updates_df)} update records")

