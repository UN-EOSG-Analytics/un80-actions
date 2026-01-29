"""Recreate the database schema."""

from pathlib import Path
from python.db.connection import get_conn

schema_file = Path("sql/schema/un80actions_schema.sql")
schema_sql = schema_file.read_text()

with get_conn() as conn:
    with conn.cursor() as cur:
        cur.execute(schema_sql)
    conn.commit()

print("✓ Schema recreated successfully")
