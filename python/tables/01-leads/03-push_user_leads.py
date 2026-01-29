"""
Push approved_user_leads connections to PostgreSQL.

Usage:
    uv run python python/leads/03-push_user_leads.py
"""

import pandas as pd

from python.api.airtable import fetch_airtable_table
from python.db.connection import get_conn

LEADS_TABLE_ID = "tbl4sybRFswhbZM2v"

# Fetch leads from Airtable (includes user_email field)
print("Fetching leads with user associations from Airtable...")
df_leads = fetch_airtable_table(table_id=LEADS_TABLE_ID)
print(f"Loaded {len(df_leads):,} leads from Airtable")

# Extract user-lead connections
# The user_email field may contain comma-separated emails for multiple users
connections = []

for _, row in df_leads.iterrows():
    lead_name = row.get("name")
    user_emails = row.get("user_email")
    
    if pd.isna(lead_name) or not lead_name:
        continue
        
    if pd.isna(user_emails) or not user_emails:
        continue
    
    # Handle both single email and comma-separated emails
    email_list = [e.strip().lower() for e in str(user_emails).split(",")]
    
    for email in email_list:
        if email and email != "nan":
            connections.append((email, lead_name))

print(f"Found {len(connections)} user-lead connections")

if not connections:
    print("No connections to upload")
    exit(0)

# Show sample
print(f"Sample connections: {connections[:5]}")

# Validate users exist in approved_users before inserting
try:
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Get all approved user emails
            cur.execute("SELECT email FROM un80actions.approved_users")
            approved_emails = {row[0] for row in cur.fetchall()}
            
    print(f"Found {len(approved_emails)} approved users in database")
    
    # Filter connections to only include approved users
    valid_connections = [
        (email, lead_name)
        for email, lead_name in connections
        if email in approved_emails
    ]
    
    invalid_count = len(connections) - len(valid_connections)
    if invalid_count > 0:
        print(f"Note: Skipping {invalid_count} connections for users not in approved_users")
        invalid_users = {email for email, _ in connections if email not in approved_emails}
        print(f"Missing users: {list(invalid_users)[:10]}")  # Show first 10
    
    connections = valid_connections
    
    if not connections:
        print("No valid connections to upload after filtering")
        exit(0)
        
except Exception as e:
    print(f"✗ Error fetching approved users: {e}")
    raise

# Upsert into database
UPSERT_SQL = """
INSERT INTO un80actions.approved_user_leads (user_email, lead_name)
VALUES (%s, %s)
ON CONFLICT (user_email, lead_name) DO NOTHING
"""

try:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(UPSERT_SQL, connections)
            conn.commit()
            print(f"✓ Successfully inserted {len(connections)} user-lead connections")
except Exception as e:
    print(f"✗ Error uploading connections: {e}")
    raise
