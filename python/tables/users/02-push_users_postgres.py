"""
Push users data to PostgreSQL approved_users table.

Usage:
    uv run python python/tables/users/02-push_users_postgres.py
"""

from pathlib import Path
import pandas as pd
import numpy as np

from python.db.connection import get_conn

# Load users data
csv_path = Path("data") / "processed" / "df_users.csv"
if not csv_path.exists():
    raise FileNotFoundError(f"Users CSV not found: {csv_path}")

df_users = pd.read_csv(csv_path)
print(f"Loaded {len(df_users):,} users from CSV")
print(f"Columns: {list(df_users.columns)}")

# CSV columns: email, full_name, entity, lead_positions, user_status, user_role
required_cols = ["email", "full_name", "entity", "user_role"]
missing = [c for c in required_cols if c not in df_users.columns]
if missing:
    raise ValueError(f"Missing required columns: {missing}")

# Clean and prepare data
df_clean = df_users.copy()

# Replace NaN with None
df_clean = df_clean.replace({np.nan: None})

# Clean string columns (only if not None)
df_clean["email"] = df_clean["email"].apply(
    lambda x: str(x).strip().lower() if x else None
)
df_clean["full_name"] = df_clean["full_name"].apply(
    lambda x: str(x).strip() if x else None
)
df_clean["entity"] = df_clean["entity"].apply(
    lambda x: str(x).strip() if x else None
)
df_clean["user_role"] = df_clean["user_role"].apply(
    lambda x: str(x).strip() if x else None
)

# Handle lead_positions (already a list from CSV processing)
if "lead_positions" in df_clean.columns:
    # Convert string representation of list to actual list if needed
    import ast
    df_clean["lead_positions"] = df_clean["lead_positions"].apply(
        lambda x: ast.literal_eval(x) if isinstance(x, str) and x.strip() else (x if isinstance(x, list) else [])
    )
else:
    df_clean["lead_positions"] = None

# Normalize role values to match enum
# Enum values: 'Principal', 'Support', 'Focal', 'Assistant', 'Admin', 'Legal'
role_mapping = {
    "Focal Point": "Focal",
    "focal point": "Focal",
}
df_clean["user_role"] = df_clean["user_role"].replace(role_mapping)

# Handle optional user_status column
if "user_status" in df_clean.columns:
    df_clean["user_status"] = df_clean["user_status"].apply(
        lambda x: str(x).strip() if x and x != "nan" else None
    )
else:
    df_clean["user_status"] = None

# Filter out lead_positions"] if isinstance(row["lead_positions"], list) else [],
        row["user_status"],
        row["user_role"],
    )
    for _, row in df_clean.iterrows()
]

# Upsert into database
UPSERT_SQL = """
INSERT INTO un80actions.approved_users (email, full_name, system_entity, lead_positions, user_status, user_role)
VALUES (%s, %s, %s, %s, %s, %s)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    system_entity = EXCLUDED.system_entity,
    lead_positions = EXCLUDED.lead_positions
    for _, row in df_clean.iterrows()
]

# Upsert into database
UPSERT_SQL = """
INSERT INTO un80actions.approved_users (email, full_name, system_entity, user_status, user_role)
VALUES (%s, %s, %s, %s, %s)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    system_entity = EXCLUDED.system_entity,
    user_status = EXCLUDED.user_status,
    user_role = EXCLUDED.user_role
"""

try:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(UPSERT_SQL, rows)
            conn.commit()
            print(f"✓ Successfully upserted {len(rows)} users to approved_users table")
except Exception as e:
    print(f"✗ Error uploading users: {e}")
    raise
