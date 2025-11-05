import json
import re
from pathlib import Path

import pandas as pd

# Paths
input_path = Path("data/input/actions_raw.json")
output_path = Path("public/data/actions.json")

# Load JSON (already an array)
with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Convert to DataFrame
df = pd.DataFrame(data)

# Drop unnecessary columns
df = df.drop(columns=["@odata.etag", "ItemInternalId"], errors="ignore")


# Decode Excel-style encoded headers (_x0023_ → #, etc.)
def decode_excel_header(header: str) -> str:
    return re.sub(r"_x([0-9A-Fa-f]{4})_", lambda m: chr(int(m.group(1), 16)), header)


df.columns = [decode_excel_header(c) for c in df.columns]

# Ensure output folder exists
output_path.parent.mkdir(parents=True, exist_ok=True)

# Save cleaned JSON (records)
df.to_json(output_path, orient="records", force_ascii=False, indent=2)

print(f"✓ Cleaned JSON written to {output_path.resolve()}")
