"""
Import "Notes on FP/working team level" (parsed from Excel) into action_notes
for the Action modal Notes tab.

Source: data/processed/notes_fp_working_team.json
Same behaviour as import_notes_from_task_force: match ActionNo, insert with
header "Unspecified", idempotent, skip when action does not exist.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import List, Optional

from python.db.connection import get_conn


PROJECT_ROOT = Path(__file__).resolve().parents[3]
JSON_PATH = PROJECT_ROOT / "data" / "processed" / "notes_fp_working_team.json"


@dataclass
class FpWorkingTeamNote:
    action_id: int
    note_date: Optional[date]
    content: str
    header: str = "Unspecified"


def load_notes_from_json() -> List[FpWorkingTeamNote]:
    if not JSON_PATH.exists():
        raise FileNotFoundError(f"JSON file not found at {JSON_PATH}")

    data = json.loads(JSON_PATH.read_text())
    notes: List[FpWorkingTeamNote] = []

    for rec in data:
        action_no = rec.get("ActionNo")
        if action_no is None:
            continue
        try:
            action_id = int(action_no)
        except (TypeError, ValueError):
            continue

        content = (rec.get("content") or "").strip()
        if not content:
            continue

        raw_date = rec.get("note_date")
        if raw_date:
            try:
                note_date = date.fromisoformat(raw_date.split("T")[0])
            except ValueError:
                note_date = None
        else:
            note_date = None

        notes.append(
            FpWorkingTeamNote(
                action_id=action_id,
                note_date=note_date,
                content=content,
            )
        )

    return notes


def main() -> None:
    notes = load_notes_from_json()
    if not notes:
        print("No FP/working team notes parsed from JSON; nothing to import.")
        return

    print(f"Parsed {len(notes)} FP/working team note entries from JSON.")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM un80actions.users LIMIT 1;")
            row = cur.fetchone()
            if not row:
                raise RuntimeError(
                    "No users found in un80actions.users; cannot assign user_id."
                )
            user_id = row[0]

            inserted = 0

            for n in notes:
                params = {
                    "action_id": n.action_id,
                    "action_sub_id": "",
                    "user_id": user_id,
                    "header": n.header,
                    "note_date": n.note_date,
                    "content": n.content,
                }

                cur.execute(
                    """
                    INSERT INTO un80actions.action_notes (
                      action_id,
                      action_sub_id,
                      user_id,
                      header,
                      note_date,
                      content,
                      content_review_status
                    )
                    SELECT
                      %(action_id)s,
                      %(action_sub_id)s,
                      %(user_id)s,
                      %(header)s,
                      %(note_date)s,
                      %(content)s,
                      'needs_review'::un80actions.content_review_status
                    WHERE NOT EXISTS (
                      SELECT 1
                      FROM un80actions.action_notes an
                      WHERE an.action_id = %(action_id)s
                        AND an.action_sub_id = %(action_sub_id)s
                        AND an.header IS NOT DISTINCT FROM %(header)s
                        AND an.note_date IS NOT DISTINCT FROM %(note_date)s
                        AND an.content = %(content)s
                    )
                    AND EXISTS (
                      SELECT 1
                      FROM un80actions.actions a
                      WHERE a.id = %(action_id)s
                        AND a.sub_id = %(action_sub_id)s
                    );
                    """,
                    params,
                )
                if cur.rowcount > 0:
                    inserted += 1

        conn.commit()

    print(f"Inserted {inserted} new notes into un80actions.action_notes.")


if __name__ == "__main__":
    main()
