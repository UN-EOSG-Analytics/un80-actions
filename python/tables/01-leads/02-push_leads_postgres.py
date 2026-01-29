"""
Push leads data to PostgreSQL `leads` table.

Usage:
    uv run python python/tables/01-leads/02-push_leads_postgres.py
"""

from pathlib import Path

import pandas as pd

from python.db.connection import get_conn

input_path = Path("data") / "processed" / "df_leads.csv"
df = pd.read_csv(input_path)

# Convert DataFrame to list of dicts, replacing NaN with None
records = df.to_dict("records")
for record in records:
    if pd.isna(record["entity"]):
        record["entity"] = None

print(f"Loading {len(records)} leads from {input_path}")

# Upsert leads into the database
with get_conn() as conn:
    with conn.cursor() as cur:
        for record in records:
            cur.execute(
                """
                INSERT INTO leads (name, entity)
                VALUES (%s, %s)
                ON CONFLICT (name) 
                DO UPDATE SET entity = EXCLUDED.entity
                """,
                (record["name"], record["entity"]),
            )

        conn.commit()
        print(f"✓ Successfully upserted {len(records)} leads into the database")

print("Done!")
