"""
Update action_member_entities from the CSV "Action Entity(s)" column.

Reads data/input/UN80 Action Plan.csv, parses the JSON-array entity column,
and upserts into un80actions.action_member_entities.

Strategy: for each action found in the CSV, delete existing entity rows then
re-insert from the CSV. Actions not present in the CSV are left untouched.

Usage:
    uv run python python/misc/update_action_entities.py
"""

import csv
import json
from pathlib import Path

from python.db.connection import get_conn

CSV_PATH = Path("data") / "input" / "UN80 Action Plan.csv"


def parse_action_id(action_no: str) -> int:
    """Convert '14' -> 14."""
    try:
        return int(action_no.strip())
    except ValueError:
        raise ValueError(f"Cannot parse action id from: {repr(action_no)}")


def parse_entities(raw: str) -> list[str]:
    """Parse a JSON array string like '["DPPA","DPO"]' into a list of strings."""
    raw = raw.strip()
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [
                str(e).strip()
                for e in parsed
                if str(e).strip() and str(e).strip() != "N/A"
            ]
    except json.JSONDecodeError:
        pass
    return []


def load_csv() -> tuple[list[tuple[int, str, str]], set[tuple[int, str]]]:
    """
    Returns:
      - list of (action_id, action_sub_id, entity) tuples
      - set of all (action_id, action_sub_id) seen in the CSV (including N/A rows)
    """
    rows = []
    all_actions: set[tuple[int, str]] = set()
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        # Normalise header: strip BOM and surrounding quotes
        reader.fieldnames = [h.strip('"').strip() for h in (reader.fieldnames or [])]
        for row in reader:
            # Re-key the row with normalised headers
            row = {k.strip('"').strip(): v for k, v in row.items()}

            action_no = row.get("Action No.", "").strip()
            if not action_no:
                continue

            sub_no = row.get("Action Sub-No.", "").strip()
            action_sub_id = sub_no if sub_no else ""

            try:
                action_id = parse_action_id(action_no)
            except ValueError as e:
                print(f"  Skipping row with bad Action No.: {e}")
                continue

            all_actions.add((action_id, action_sub_id))
            entities = parse_entities(row.get("Action Entity(s)", ""))
            for entity in entities:
                rows.append((action_id, action_sub_id, entity))

    return rows, all_actions


def main():
    print(f"Reading CSV: {CSV_PATH}")
    entity_links, actions_in_csv = load_csv()
    print(
        f"Found {len(entity_links)} (action, entity) pairs across {len(actions_in_csv)} actions"
    )
    print(f"Covering {len(actions_in_csv)} distinct actions")

    with get_conn() as conn:
        with conn.cursor() as cur:
            # Fetch existing (action_id, action_sub_id) pairs to avoid FK violations
            cur.execute("SELECT id, sub_id FROM un80actions.actions")
            existing_actions = {(r[0], r[1]) for r in cur.fetchall()}

            skipped = [
                (aid, asid, ent)
                for aid, asid, ent in entity_links
                if (aid, asid) not in existing_actions
            ]
            if skipped:
                missing = sorted({(aid, asid) for aid, asid, _ in skipped})
                print(
                    f"  WARNING: skipping {len(skipped)} links for {len(missing)} actions not in DB:"
                )
                for aid, asid in missing:
                    print(f"    - action {aid}{asid}")

            entity_links = [
                (aid, asid, ent)
                for aid, asid, ent in entity_links
                if (aid, asid) in existing_actions
            ]
            # Keep actions_in_csv from CSV (includes N/A actions with no entity rows)
            actions_in_csv = {
                (aid, asid)
                for aid, asid in actions_in_csv
                if (aid, asid) in existing_actions
            }

            # For each action in CSV, clear existing entities first (handles N/A cleanup)
            for action_id, action_sub_id in actions_in_csv:
                cur.execute(
                    "DELETE FROM un80actions.action_member_entities "
                    "WHERE action_id = %s AND action_sub_id = %s",
                    (action_id, action_sub_id),
                )

            # Ensure all entities exist in un80actions.entities
            unique_entities = sorted({r[2] for r in entity_links})
            cur.executemany(
                "INSERT INTO un80actions.entities (entity) VALUES (%s) ON CONFLICT (entity) DO NOTHING",
                [(e,) for e in unique_entities],
            )
            print(f"Upserted {len(unique_entities)} entities into un80actions.entities")

            if entity_links:
                cur.executemany(
                    """
                    INSERT INTO un80actions.action_member_entities (action_id, action_sub_id, entity)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (action_id, action_sub_id, entity) DO NOTHING
                    """,
                    entity_links,
                )

            # Remove any entities no longer referenced by any action
            cur.execute(
                """
                DELETE FROM un80actions.entities
                WHERE entity NOT IN (SELECT DISTINCT entity FROM un80actions.action_member_entities)
                  AND entity NOT IN (SELECT entity FROM un80actions.approved_users WHERE entity IS NOT NULL)
                  AND entity NOT IN (SELECT entity FROM un80actions.leads WHERE entity IS NOT NULL)
                  AND entity NOT IN (SELECT submitted_by_entity FROM un80actions.action_milestones WHERE submitted_by_entity IS NOT NULL)
                """
            )

            conn.commit()
            print(
                f"Done. Upserted {len(entity_links)} entity rows across {len(actions_in_csv)} actions."
            )


if __name__ == "__main__":
    main()
