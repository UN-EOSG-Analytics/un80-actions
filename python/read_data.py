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

# Rename columns to clean standard names
column_mapping = {
    "NO.": "action_number",
    "Report": "report",
    "WP-#": "work_package_number",
    "Main W-Package": "work_package_name",
    "Doc Para": "document_paragraph",
    "Indicative Activity": "indicative_activity",
    "Big Ticket": "big_ticket",
    "WP Lead(s)": "work_package_leads",
    "First Milestone": "first_milestone",
    "M/S Approval (first step)": "ms_approval",
    "M/S Body": "ms_body",
    "Legal Consideration": "legal_consideration",
    "UN Budget": "un_budget",
}

# Detect and print unmapped columns
unmapped_columns = [col for col in df.columns if col not in column_mapping]
if unmapped_columns:
    print("⚠️  Unmapped columns detected (not renamed):")
    for col in unmapped_columns:
        print(f"   - '{col}'")
    print()

# Rename only the columns in the mapping (keep all columns)
df = df.rename(columns=column_mapping)

# Ensure output folder exists
output_path.parent.mkdir(parents=True, exist_ok=True)

# Save cleaned JSON (records)
df.to_json(output_path, orient="records", force_ascii=False, indent=2)

print(f"✓ Cleaned JSON written to {output_path.resolve()}")
