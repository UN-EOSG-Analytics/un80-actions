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

# Replace empty strings with None for proper null handling in JSON
df = df.replace("", None)

# Sort by work_package_number then action_number ascending
df = df.sort_values(by=["work_package_number", "action_number"], ascending=[True, True])

# Ensure output folder exists
output_path.parent.mkdir(parents=True, exist_ok=True)

# Save cleaned JSON
df.to_json(output_path, orient="records", force_ascii=False, indent=2)

print(f"✓ Cleaned JSON written to {output_path.resolve()}")
print(f"✓ Processed {len(df)} records")
