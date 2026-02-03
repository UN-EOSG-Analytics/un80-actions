"""Run migration 003: add reply_to to action_legal_comments for threaded replies."""

from pathlib import Path

from python.db.connection import get_conn

# Migration file path (from project root)
project_root = Path(__file__).resolve().parent.parent.parent
migration_file = project_root / "sql" / "migrations" / "003_add_legal_comment_reply_to.sql"
migration_sql = migration_file.read_text()

with get_conn() as conn:
    with conn.cursor() as cur:
        cur.execute(migration_sql)
    conn.commit()

print("✓ Migration 003 applied: reply_to column added to action_legal_comments")
