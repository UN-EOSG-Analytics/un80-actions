"""
Extract milestone data from processed actions CSV and populate action_milestones table.

This script reads milestone columns from the CSV (which has more milestone data than
the simplified actions table in the database) and creates separate milestone records.

Mapping:
- milestone_1 + milestone_1_deadline -> type='first'
- milestone_2 + milestone_2_deadline -> type='second'
- milestone_3 + milestone_3_deadline -> type='third'
- milestone_upcoming + milestone_upcoming_deadline -> type='upcoming'
- milestone_final + milestone_final_deadline -> type='final'

Usage:
    uv run python python/tables/04-milestones/populate_milestones.py
"""

from pathlib import Path

import pandas as pd

from python.db.connection import get_conn

# Load processed actions data (includes milestone columns)
parquet_path = Path("data") / "processed" / "actions.parquet"
df_actions = pd.read_parquet(parquet_path)

print(f"Loaded {len(df_actions)} actions from Parquet")

# Prepare milestone data
milestones = []

for _, row in df_actions.iterrows():
    action_id = int(row["id"])
    action_sub_id = str(row["sub_id"]) if pd.notna(row["sub_id"]) and row["sub_id"] else None
    
    # Milestone 1 (type='first')
    if pd.notna(row.get("milestone_1")) or pd.notna(row.get("milestone_1_deadline")):
        milestones.append((
            action_id,
            action_sub_id,
            'first',
            row.get("milestone_1") if pd.notna(row.get("milestone_1")) else None,
            pd.to_datetime(row["milestone_1_deadline"]).date() if pd.notna(row.get("milestone_1_deadline")) else None,
            'draft'
        ))
    
    # Milestone 2 (type='second')
    if pd.notna(row.get("milestone_2")) or pd.notna(row.get("milestone_2_deadline")):
        milestones.append((
            action_id,
            action_sub_id,
            'second',
            row.get("milestone_2") if pd.notna(row.get("milestone_2")) else None,
            pd.to_datetime(row["milestone_2_deadline"]).date() if pd.notna(row.get("milestone_2_deadline")) else None,
            'draft'
        ))
    
    # Milestone 3 (type='third')
    if pd.notna(row.get("milestone_3")) or pd.notna(row.get("milestone_3_deadline")):
        milestones.append((
            action_id,
            action_sub_id,
            'third',
            row.get("milestone_3") if pd.notna(row.get("milestone_3")) else None,
            pd.to_datetime(row["milestone_3_deadline"]).date() if pd.notna(row.get("milestone_3_deadline")) else None,
            'draft'
        ))
    
    # Milestone upcoming (type='upcoming')
    if pd.notna(row.get("milestone_upcoming")) or pd.notna(row.get("milestone_upcoming_deadline")):
        milestones.append((
            action_id,
            action_sub_id,
            'upcoming',
            row.get("milestone_upcoming") if pd.notna(row.get("milestone_upcoming")) else None,
            pd.to_datetime(row["milestone_upcoming_deadline"]).date() if pd.notna(row.get("milestone_upcoming_deadline")) else None,
            'draft'
        ))
    
    # Milestone final (type='final')
    if pd.notna(row.get("milestone_final")) or pd.notna(row.get("milestone_final_deadline")):
        milestones.append((
            action_id,
            action_sub_id,
            'final',
            row.get("milestone_final") if pd.notna(row.get("milestone_final")) else None,
            pd.to_datetime(row["milestone_final_deadline"]).date() if pd.notna(row.get("milestone_final_deadline")) else None,
            'draft'
        ))

print(f"Prepared {len(milestones)} milestones")

# Upsert into database
with get_conn() as conn:
    with conn.cursor() as cur:
        # Clear existing milestones
        cur.execute("DELETE FROM un80actions.action_milestones")
        print("Cleared existing milestones")
        
        # Insert new milestones
        if milestones:
            INSERT_MILESTONE_SQL = """
            INSERT INTO un80actions.action_milestones 
            (action_id, action_sub_id, milestone_type, description, deadline, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            cur.executemany(INSERT_MILESTONE_SQL, milestones)
            print(f"✓ Created {len(milestones)} milestones")
        
        conn.commit()
        
        # Summary statistics
        cur.execute("""
            SELECT 
                milestone_type, 
                COUNT(*) as count,
                COUNT(deadline) as with_deadline,
                COUNT(description) as with_description
            FROM un80actions.action_milestones
            GROUP BY milestone_type
            ORDER BY milestone_type
        """)
        
        print("\nMilestone summary:")
        for row in cur.fetchall():
            milestone_type, count, with_deadline, with_description = row
            print(f"  {milestone_type:10s}: {count:3d} total, {with_deadline:3d} with deadline, {with_description:3d} with description")

print("\nDone!")
