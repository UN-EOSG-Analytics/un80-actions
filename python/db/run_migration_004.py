"""Run migration 004: add header, subtext, and question_date to action_questions."""

from pathlib import Path

from python.db.connection import get_conn

# Migration file path (from project root)
project_root = Path(__file__).resolve().parent.parent.parent
migration_file = project_root / "sql" / "migrations" / "004_add_question_fields.sql"
migration_sql = migration_file.read_text()

with get_conn() as conn:
    with conn.cursor() as cur:
        cur.execute(migration_sql)
    conn.commit()

print("✓ Migration 004 applied: header, subtext, and question_date columns added to action_questions")
