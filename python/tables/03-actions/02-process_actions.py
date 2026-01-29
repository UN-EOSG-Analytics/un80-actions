from pathlib import Path

import pandas as pd
from utils.utils import convert_linked_columns_to_lists, export_dataframe

input_path = Path("data") / "input" / "actions_raw.parquet"
df = pd.read_parquet(input_path)

print(f"\nLoaded {len(df)} actions.\n")
# print(f"Columns: {list(df.columns)}")


##################################################################

# Linked columns to lists

linked_columns = [
    "work_package_leads",
    "work_package_focal_points",
    "action_leads",
    "action_focal_points",
    "action_member_persons",
    "action_support_persons",
]

df = convert_linked_columns_to_lists(df, linked_columns)

# add SQL types




# Export ------------------------------------------------------

# Create output directory if needed
output_dir = Path("data") / "processed"
export_dataframe(df, "actions", output_dir)

print("\nData processing complete!")
