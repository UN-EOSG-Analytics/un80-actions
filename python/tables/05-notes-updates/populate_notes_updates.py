"""
Extract action notes and updates from processed actions and populate tables.

This script reads action_notes and action_updates columns from the parquet file
and creates separate records in the action_notes and action_updates tables.

Usage:
    uv run python python/tables/05-notes-updates/populate_notes_updates.py
"""

from pathlib import Path

import pandas as pd

from python.db.connection import get_conn

# Load processed actions data
parquet_path = Path("data") / "processed" / "actions.parquet"
df_actions = pd.read_parquet(parquet_path)

print(f"Loaded {len(df_actions)} actions from Parquet")

# Prepare notes and updates data
notes = []
updates = []

for _, row in df_actions.iterrows():
    action_id = int(row["id"])
    action_sub_id = str(row["sub_id"]) if pd.notna(row["sub_id"]) and row["sub_id"] else None
    
    # Extract notes if present
    if pd.notna(row.get("action_notes")) and row.get("action_notes"):
        notes.append((
            action_id,
            action_sub_id,
            None,  # user_id - NULL since this is seed data from Airtable, not created by a user
            str(row["action_notes"])
        ))
    
    # Extract updates if present
    if pd.notna(row.get("action_updates")) and row.get("action_updates"):
        updates.append((
            action_id,
            action_sub_id,
            None,  # user_id - NULL since this is seed data from Airtable
            str(row["action_updates"])
        ))

print(f"Prepared {len(notes)} notes and {len(updates)} updates")

# Insert into database
with get_conn() as conn:
    with conn.cursor() as cur:
        # Clear ONLY seed data (notes/updates with user_id IS NULL from Airtable).
        # Never delete user-created content (user_id IS NOT NULL) so all users
        # always see all notes/updates from everyone.
        cur.execute("DELETE FROM un80actions.action_notes WHERE user_id IS NULL")
        cur.execute("DELETE FROM un80actions.action_updates WHERE user_id IS NULL")
        print("Cleared existing seed notes and updates (user-created content preserved)")
        
        # Insert notes
        if notes:
            INSERT_NOTES_SQL = """
            INSERT INTO un80actions.action_notes 
            (action_id, action_sub_id, user_id, content)
            VALUES (%s, %s, %s, %s)
            """
            cur.executemany(INSERT_NOTES_SQL, notes)
            print(f"✓ Created {len(notes)} action notes")
        
        # Insert updates
        if updates:
            INSERT_UPDATES_SQL = """
            INSERT INTO un80actions.action_updates 
            (action_id, action_sub_id, user_id, content)
            VALUES (%s, %s, %s, %s)
            """
            cur.executemany(INSERT_UPDATES_SQL, updates)
            print(f"✓ Created {len(updates)} action updates")
        
        conn.commit()

print("\nDone!")
