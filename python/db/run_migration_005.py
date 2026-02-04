"""Run migration 005: add header and note_date to action_notes."""

from pathlib import Path

from python.db.connection import get_conn

# Migration file path (from project root)
project_root = Path(__file__).resolve().parent.parent.parent
migration_file = project_root / "sql" / "migrations" / "005_add_note_fields.sql"
migration_sql = migration_file.read_text()

with get_conn() as conn:
    with conn.cursor() as cur:
        cur.execute(migration_sql)
    conn.commit()

print("✓ Migration 005 applied: header and note_date columns added to action_notes")
