"""
Push leads data to PostgreSQL leads table.

Usage:
    uv run python python/leads/02-push_leads_postgres.py
"""

import pandas as pd

from python.api.airtable import fetch_airtable_table
from python.db.connection import get_conn

LEADS_TABLE_ID = "tbl4sybRFswhbZM2v"

# Fetch leads from Airtable
print("Fetching leads from Airtable...")
df_leads = fetch_airtable_table(table_id=LEADS_TABLE_ID)
print(f"Loaded {len(df_leads):,} leads from Airtable")

# Select and clean columns
df_clean = df_leads[["name", "entity"]].copy()

# Clean name column (required)
df_clean["name"] = df_clean["name"].apply(
    lambda x: str(x).strip() if pd.notna(x) else None
)


# Clean entity column (nullable - convert NaN to None)
def clean_entity(val):
    # Check for various forms of NaN
    if pd.isna(val) or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    return s if s and s.lower() != "nan" else None


df_clean["entity"] = df_clean["entity"].apply(clean_entity)

# Filter out rows with missing name
df_clean = df_clean.dropna(subset=["name"])

# Show summary
leads_without_entity = df_clean[df_clean["entity"].isna()]
if not leads_without_entity.empty:
    print(
        f"Note: {len(leads_without_entity)} leads without entity: "
        f"{leads_without_entity['name'].tolist()}"
    )

# Convert to tuples for insertion, explicitly handling any remaining NaN
rows = [
    (row["name"], None if pd.isna(row["entity"]) else row["entity"])
    for _, row in df_clean.iterrows()
]

# Upsert into database
UPSERT_SQL = """
INSERT INTO un80actions.leads (name, entity)
VALUES (%s, %s)
ON CONFLICT (name) DO UPDATE SET
    entity = EXCLUDED.entity
"""

try:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(UPSERT_SQL, rows)
            conn.commit()
            print(f"✓ Successfully upserted {len(rows)} leads to leads table")
except Exception as e:
    print(f"✗ Error uploading leads: {e}")
    raise
