"""
Push users data to PostgreSQL approved_users table and link them to leads.

Usage:
    uv run python python/tables/02-users/02-push_users_postgres.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

from python.db.connection import get_conn

parquet_path = Path("data") / "processed" / "df_users.parquet"
df_users = pd.read_parquet(parquet_path)


print(f"Loaded {len(df_users):,} users from Parquet")
print(f"Columns: {list(df_users.columns)}")

# CSV columns: email, full_name, entity, lead_positions, user_status, user_role
required_cols = ["email", "full_name", "entity", "user_role"]
missing = [c for c in required_cols if c not in df_users.columns]
if missing:
    raise ValueError(f"Missing required columns: {missing}")

# Clean and prepare data
df_clean = df_users.copy()

# Store lead_positions before any NaN replacement (to preserve lists)
if "lead_positions" in df_clean.columns:
    lead_positions_backup = df_clean["lead_positions"].copy()
else:
    lead_positions_backup = None

# Replace NaN with None for scalar columns only
for col in ["email", "full_name", "entity", "user_status", "user_role"]:
    if col in df_clean.columns:
        df_clean[col] = df_clean[col].replace({np.nan: None})

# Restore lead_positions (don't convert lists to None)
if lead_positions_backup is not None:
    df_clean["lead_positions"] = lead_positions_backup

# Clean string columns (only if not None)
df_clean["email"] = df_clean["email"].apply(
    lambda x: str(x).strip().lower() if x else None
)
df_clean["full_name"] = df_clean["full_name"].apply(
    lambda x: str(x).strip() if x else None
)
df_clean["entity"] = df_clean["entity"].apply(lambda x: str(x).strip() if x else None)
df_clean["user_role"] = df_clean["user_role"].apply(
    lambda x: str(x).strip() if x else None
)

# lead_positions is already a list from Parquet (but may be numpy arrays)
# Convert numpy arrays to Python lists and ensure empty lists for missing lead_positions
if "lead_positions" not in df_clean.columns:
    df_clean["lead_positions"] = [[] for _ in range(len(df_clean))]
else:
    df_clean["lead_positions"] = df_clean["lead_positions"].apply(
        lambda x: list(x)
        if x is not None and hasattr(x, "__iter__") and not isinstance(x, str)
        else []
    )

# Handle optional user_status column
if "user_status" in df_clean.columns:
    df_clean["user_status"] = df_clean["user_status"].apply(
        lambda x: str(x).strip() if x and str(x) != "nan" else None
    )
else:
    df_clean["user_status"] = None

# Only filter rows with missing critical fields (email)
# Allow missing full_name, entity, or user_role for now and report them
df_missing = df_clean[df_clean["email"].isna()]
if len(df_missing) > 0:
    print(f"⚠ Skipping {len(df_missing)} users with missing email")
    df_clean = df_clean[df_clean["email"].notna()]

# Check for other missing fields but don't filter them out yet
for col in ["full_name", "entity", "user_role"]:
    missing_count = df_clean[col].isna().sum()
    if missing_count > 0:
        print(f"⚠ Warning: {missing_count} users have missing {col}")

print(
    f"Processing {len(df_clean):,} users (filtered {len(df_users) - len(df_clean)} with missing email)"
)

# Collect all unique leads from all users
all_leads = set()
for lead_list in df_clean["lead_positions"]:
    if isinstance(lead_list, list):
        all_leads.update(lead_list)

print(f"Found {len(all_leads)} unique lead positions across all users")

# Prepare rows for approved_users table (without lead_positions)
# Convert any remaining NaN/None to proper None values for database
user_rows = [
    (
        row["email"] if pd.notna(row["email"]) else None,
        row["full_name"] if pd.notna(row["full_name"]) else None,
        row["entity"] if pd.notna(row["entity"]) else None,
        row["user_status"] if pd.notna(row["user_status"]) else None,
        row["user_role"] if pd.notna(row["user_role"]) else None,
    )
    for _, row in df_clean.iterrows()
]

# Prepare data for leads table and approved_user_leads table
lead_entity_map = {}  # Map lead_name -> entity
user_lead_links = []  # List of (email, lead_name) tuples

for _, row in df_clean.iterrows():
    email = row["email"]
    entity = row["entity"]
    lead_positions = (
        row["lead_positions"] if isinstance(row["lead_positions"], list) else []
    )

    for lead_name in lead_positions:
        if lead_name:
            # Store the entity for this lead (assumes one lead has one primary entity)
            if lead_name not in lead_entity_map:
                lead_entity_map[lead_name] = entity
            # Store the user-lead link
            user_lead_links.append((email, lead_name))

print(f"Prepared {len(user_rows)} user records")
print(f"Prepared {len(lead_entity_map)} unique leads")
print(f"Prepared {len(user_lead_links)} user-lead links")

# Upsert into database
try:
    with get_conn() as conn:
        with conn.cursor() as cur:
            # 1. Upsert approved_users
            UPSERT_USERS_SQL = """
            INSERT INTO un80actions.approved_users (email, full_name, entity, user_status, user_role)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (email) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                entity = EXCLUDED.entity,
                user_status = EXCLUDED.user_status,
                user_role = EXCLUDED.user_role
            """
            cur.executemany(UPSERT_USERS_SQL, user_rows)
            print(f"✓ Upserted {len(user_rows)} users to approved_users table")

            # 2. Upsert leads
            if lead_entity_map:
                UPSERT_LEADS_SQL = """
                INSERT INTO un80actions.leads (name, entity)
                VALUES (%s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    entity = EXCLUDED.entity
                """
                lead_rows = [
                    (lead_name, entity) for lead_name, entity in lead_entity_map.items()
                ]
                cur.executemany(UPSERT_LEADS_SQL, lead_rows)
                print(f"✓ Upserted {len(lead_rows)} leads to leads table")

            # 3. Clear and repopulate approved_user_leads
            # First, delete existing links for these users
            DELETE_USER_LEADS_SQL = """
            DELETE FROM un80actions.approved_user_leads
            WHERE user_email = ANY(%s)
            """
            user_emails = [row[0] for row in user_rows]
            cur.execute(DELETE_USER_LEADS_SQL, (user_emails,))
            print(f"✓ Cleared existing user-lead links")

            # Then insert new links
            if user_lead_links:
                INSERT_USER_LEADS_SQL = """
                INSERT INTO un80actions.approved_user_leads (user_email, lead_name)
                VALUES (%s, %s)
                ON CONFLICT (user_email, lead_name) DO NOTHING
                """
                cur.executemany(INSERT_USER_LEADS_SQL, user_lead_links)
                print(
                    f"✓ Inserted {len(user_lead_links)} user-lead links to approved_user_leads table"
                )

            conn.commit()
            print(f"\n✓ Successfully completed all database operations")

except Exception as e:
    print(f"✗ Error uploading users: {e}")
    raise
