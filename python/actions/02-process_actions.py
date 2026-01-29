import ast
from pathlib import Path

import pandas as pd

from utils.utils import export_dataframe

input_path = Path("data") / "input" / "actions_raw.parquet"
df = pd.read_parquet(input_path)

print(f"\nLoaded {len(df)} actions.\n")
# print(f"Columns: {list(df.columns)}")


##################################################################

# Linked columns to lists

# 1. "work_package_leads"
# 2. "work_package_focal_points"
# 3. "action_leads"
# 4. "action_focal_points"
# 5. "action_member_persons"
# 6. "action_support_persons"

linked_columns = [
    "work_package_leads",
    "work_package_focal_points",
    "action_leads",
    "action_focal_points",
    "action_member_persons",
    "action_support_persons",
]

# Convert linked columns from comma-separated strings to lists
for col in linked_columns:
    if col in df.columns:
        df[col] = df[col].fillna("")
        df[col] = df[col].apply(
            lambda x: [item.strip() for item in x.split(", ")] if x.strip() else []
        )
        print(f"Processed linked column: '{col}'")

# add SQL types


# Export ------------------------------------------------------

# Create output directory if needed
output_dir = Path("data") / "processed"
export_dataframe(df,"actions", output_dir)

print("\nData processing complete!")
