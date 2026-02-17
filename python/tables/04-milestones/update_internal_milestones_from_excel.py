"""
Update internal milestones (action modal Milestone tab) from the UN80 Action Plan Excel.

Reads:
  - Excel: path given as first argument or default below
  - Sheet: "UN80 Action Plan (3)" (or first sheet if name differs)
  - Columns:
    - "Action No." / "Action Sub-No." to identify the action
    - "Milestone 1" + "Milestone 1 Deadline" → First Milestone (internal)
    - "Milestone Final" + "Milestone Final - Deadline" → Final Milestone (internal)
    - "Milestone 2" + "Milestone 2 Deadline" → Second Milestone (internal, if present)
    - "Milestone 3" + "Milestone 3 Deadline" → Third Milestone (internal, if present)
    - "Needs Attention" → status badge (Draft, Finalized, Needs attention, etc.)

For each action row:
  - UPSERT: updates description/deadline for existing internal milestones (keeps status);
    inserts new internal milestones only for types present in Excel (as draft).
  - Applies status from "Needs Attention" to all internal milestones for that action.

Usage:
  uv run python python/tables/04-milestones/update_internal_milestones_from_excel.py [path_to_excel]

Dry run (no DB writes):
  DRY_RUN=1 uv run python python/tables/04-milestones/update_internal_milestones_from_excel.py [path]
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Any

import pandas as pd

# Project root and db
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from python.db.connection import get_conn

DEFAULT_EXCEL_PATH = Path("/Users/niklasquendt/Downloads/UN80 Action Plan (3).xlsx")
SHEET_NAME = "UN80 Action Plan (3)"

# Column names in the Excel (header row 0)
COL_ACTION_NO = "Action No."
COL_ACTION_SUB = "Action Sub-No."
COL_NEEDS_ATTENTION = "Needs Attention"
COL_M1 = "Milestone 1"
COL_M1_DEADLINE = "Milestone 1 Deadline"
COL_M2 = "Milestone 2"
COL_M2_DEADLINE = "Milestone 2 Deadline"
COL_M3 = "Milestone 3"
COL_M3_DEADLINE = "Milestone 3 Deadline"
COL_M_FINAL = "Milestone Final"
COL_M_FINAL_DEADLINE = "Milestone Final - Deadline"

MILESTONE_ORDER = ["first", "second", "third", "final"]

# Excel "Needs Attention" value (normalized) -> internal status name (for badge/dropdown)
STATUS_MAP = {
    "draft": "draft",
    "no submission": "draft",
    "in progress": "draft",
    "needs attention": "needs_attention",
    "attention to timeline": "attention_to_timeline",
    "confirmation needed": "confirmation_needed",
    "approved": "approved",
    "finalized": "finalized",
    "needs ola review": "needs_ola_review",
    "reviewed by ola": "reviewed_by_ola",
    "in review": "draft",
}


def _parse_deadline(value: Any) -> str | None:
    """Return ISO date string (YYYY-MM-DD) or None."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        dt = pd.to_datetime(value)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None


def _str_or_none(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = str(value).strip()
    return s if s else None


def _normalize_status(raw: Any) -> str | None:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = re.sub(r"\s+", " ", str(raw).strip()).lower()
    return s if s else None


def load_excel(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Excel file not found: {path}")
    # Try named sheet first, else first sheet
    try:
        df = pd.read_excel(path, sheet_name=SHEET_NAME, header=0)
    except Exception:
        xl = pd.ExcelFile(path)
        df = pd.read_excel(path, sheet_name=xl.sheet_names[0], header=0)
    required = [COL_ACTION_NO, COL_M1, COL_M1_DEADLINE, COL_M_FINAL, COL_M_FINAL_DEADLINE]
    for col in required:
        if col not in df.columns:
            raise ValueError(
                f"Missing column '{col}' in Excel. Columns: {list(df.columns)}"
            )
    return df


def extract_action_status_pairs(df: pd.DataFrame) -> list[tuple[int, str, str]]:
    """Returns list of (action_id, action_sub_id, internal_status) from 'Needs Attention' column."""
    if COL_NEEDS_ATTENTION not in df.columns:
        return []
    out: list[tuple[int, str, str]] = []
    for _, row in df.iterrows():
        no = row.get(COL_ACTION_NO)
        if pd.isna(no):
            continue
        try:
            action_id = int(no)
        except (TypeError, ValueError):
            continue
        sub = row.get(COL_ACTION_SUB)
        if pd.isna(sub) or sub == "" or str(sub).strip() == "":
            action_sub_id = ""
        else:
            action_sub_id = str(sub).strip()
        raw = row.get(COL_NEEDS_ATTENTION)
        norm = _normalize_status(raw)
        if norm is None:
            continue
        internal = STATUS_MAP.get(norm)
        if internal is None:
            continue
        out.append((action_id, action_sub_id, internal))
    return out


def _sql_for_status(status: str) -> str:
    """SQL to set one internal-milestone status and clear others for (action_id, action_sub_id)."""
    if status == "draft":
        return """
    UPDATE un80actions.action_milestones
    SET is_draft = TRUE, is_approved = FALSE, needs_attention = FALSE,
        needs_ola_review = FALSE, reviewed_by_ola = FALSE, finalized = FALSE,
        attention_to_timeline = FALSE, confirmation_needed = FALSE,
        content_review_status = 'needs_review'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "finalized":
        return """
    UPDATE un80actions.action_milestones
    SET finalized = TRUE, is_draft = FALSE, is_approved = FALSE, needs_attention = FALSE,
        needs_ola_review = FALSE, reviewed_by_ola = FALSE, attention_to_timeline = FALSE,
        confirmation_needed = FALSE, content_review_status = 'approved'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "attention_to_timeline":
        return """
    UPDATE un80actions.action_milestones
    SET attention_to_timeline = TRUE, is_draft = FALSE, is_approved = FALSE, needs_attention = FALSE,
        needs_ola_review = FALSE, reviewed_by_ola = FALSE, finalized = FALSE,
        confirmation_needed = FALSE, content_review_status = 'approved'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "confirmation_needed":
        return """
    UPDATE un80actions.action_milestones
    SET confirmation_needed = TRUE, is_draft = FALSE, is_approved = FALSE, needs_attention = FALSE,
        needs_ola_review = FALSE, reviewed_by_ola = FALSE, finalized = FALSE,
        attention_to_timeline = FALSE, content_review_status = 'approved'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "needs_attention":
        return """
    UPDATE un80actions.action_milestones
    SET needs_attention = TRUE, is_draft = FALSE, is_approved = FALSE,
        needs_ola_review = FALSE, reviewed_by_ola = FALSE, finalized = FALSE,
        attention_to_timeline = FALSE, confirmation_needed = FALSE,
        content_review_status = 'needs_review'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "approved":
        return """
    UPDATE un80actions.action_milestones
    SET is_approved = TRUE, is_draft = FALSE, needs_attention = FALSE,
        needs_ola_review = FALSE, reviewed_by_ola = FALSE, finalized = FALSE,
        attention_to_timeline = FALSE, confirmation_needed = FALSE,
        content_review_status = 'approved'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "needs_ola_review":
        return """
    UPDATE un80actions.action_milestones
    SET needs_ola_review = TRUE, is_draft = FALSE, is_approved = FALSE, needs_attention = FALSE,
        reviewed_by_ola = FALSE, finalized = FALSE, attention_to_timeline = FALSE,
        confirmation_needed = FALSE, content_review_status = 'needs_review'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "reviewed_by_ola":
        return """
    UPDATE un80actions.action_milestones
    SET reviewed_by_ola = TRUE, is_draft = FALSE, is_approved = FALSE, needs_attention = FALSE,
        needs_ola_review = FALSE, finalized = FALSE, attention_to_timeline = FALSE,
        confirmation_needed = FALSE, content_review_status = 'approved'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    raise ValueError(f"Unknown status: {status}")


def row_to_internal_milestones(row: pd.Series) -> list[dict[str, Any]]:
    """Convert one Excel row to a list of internal milestone dicts (order: first, second, third, final)."""
    out: list[dict[str, Any]] = []

    # First milestone (always include if any data)
    m1_desc = _str_or_none(row.get(COL_M1))
    m1_dead = _parse_deadline(row.get(COL_M1_DEADLINE))
    if m1_desc is not None or m1_dead is not None:
        out.append({
            "milestone_type": "first",
            "description": m1_desc,
            "deadline": m1_dead,
        })

    # Second milestone
    m2_desc = _str_or_none(row.get(COL_M2))
    m2_dead = _parse_deadline(row.get(COL_M2_DEADLINE))
    if m2_desc is not None or m2_dead is not None:
        out.append({
            "milestone_type": "second",
            "description": m2_desc,
            "deadline": m2_dead,
        })

    # Third milestone
    m3_desc = _str_or_none(row.get(COL_M3))
    m3_dead = _parse_deadline(row.get(COL_M3_DEADLINE))
    if m3_desc is not None or m3_dead is not None:
        out.append({
            "milestone_type": "third",
            "description": m3_desc,
            "deadline": m3_dead,
        })

    # Final milestone (always include if any data)
    mf_desc = _str_or_none(row.get(COL_M_FINAL))
    mf_dead = _parse_deadline(row.get(COL_M_FINAL_DEADLINE))
    if mf_desc is not None or mf_dead is not None:
        out.append({
            "milestone_type": "final",
            "description": mf_desc,
            "deadline": mf_dead,
        })

    return out


def extract_action_milestones(df: pd.DataFrame) -> list[tuple[int, str, list[dict[str, Any]]]]:
    """Returns list of (action_id, action_sub_id, list of milestone dicts)."""
    out: list[tuple[int, str, list[dict[str, Any]]]] = []
    for _, row in df.iterrows():
        no = row.get(COL_ACTION_NO)
        if pd.isna(no):
            continue
        try:
            action_id = int(no)
        except (TypeError, ValueError):
            continue
        sub = row.get(COL_ACTION_SUB)
        if pd.isna(sub) or sub == "" or str(sub).strip() == "":
            action_sub_id = ""
        else:
            action_sub_id = str(sub).strip()
        milestones = row_to_internal_milestones(row)
        if not milestones:
            continue
        out.append((action_id, action_sub_id, milestones))
    return out


def main() -> None:
    dry_run = os.environ.get("DRY_RUN", "").strip().lower() in ("1", "true", "yes")
    path = DEFAULT_EXCEL_PATH
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])

    print(f"Reading Excel: {path}")
    df = load_excel(path)
    print(f"Rows (with header): {len(df) + 1}")

    actions_milestones = extract_action_milestones(df)
    status_pairs = extract_action_status_pairs(df)
    print(f"Actions with at least one internal milestone: {len(actions_milestones)}")
    if status_pairs:
        from collections import Counter
        print(f"Status rows from 'Needs Attention': {len(status_pairs)}")
        for st, count in Counter(s for (_, _, s) in status_pairs).most_common(5):
            print(f"  {st}: {count}")

    total_milestones = sum(len(m) for _, _, m in actions_milestones)
    print(f"Total internal milestones to upsert: {total_milestones}")

    if dry_run:
        print("\n[DRY RUN] No database changes.")
        for action_id, action_sub_id, milestones in actions_milestones[:5]:
            print(f"  Action {action_id} {repr(action_sub_id)}: {[m['milestone_type'] for m in milestones]}")
        if len(actions_milestones) > 5:
            print(f"  ... and {len(actions_milestones) - 5} more actions")
        if status_pairs:
            print(f"  Would apply status for {len(status_pairs)} actions")
        return

    with get_conn() as conn:
        with conn.cursor() as cur:
            # Validate actions exist; filter to only those in DB
            valid: list[tuple[int, str, list[dict[str, Any]]]] = []
            for action_id, action_sub_id, milestones in actions_milestones:
                cur.execute(
                    "SELECT 1 FROM un80actions.actions WHERE id = %s AND sub_id = %s",
                    (action_id, action_sub_id),
                )
                if not cur.fetchone():
                    print(f"Warning: Action ({action_id}, {repr(action_sub_id)}) not found in DB, skipping.")
                else:
                    valid.append((action_id, action_sub_id, milestones))
            actions_milestones = valid

            updated = 0
            inserted = 0
            for action_id, action_sub_id, milestones in actions_milestones:
                # Fetch existing internal milestones for this action (milestone_type -> id, serial_number)
                cur.execute(
                    """SELECT milestone_type, id, serial_number
                       FROM un80actions.action_milestones
                       WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE""",
                    (action_id, action_sub_id),
                )
                existing = {row[0]: (row[1], row[2]) for row in cur.fetchall()}

                # Next serial for new milestones
                next_serial = max((s for _, s in existing.values()), default=0) + 1

                for m in milestones:
                    mtype = m["milestone_type"]
                    desc = m.get("description")
                    dead = m.get("deadline")
                    if mtype in existing:
                        # Update description and deadline only (preserve status badge)
                        cur.execute(
                            """UPDATE un80actions.action_milestones
                               SET description = %s, deadline = %s::date
                               WHERE id = %s""",
                            (desc, dead, existing[mtype][0]),
                        )
                        updated += cur.rowcount
                    else:
                        # Insert new internal milestone as draft
                        cur.execute(
                            """INSERT INTO un80actions.action_milestones
                               (action_id, action_sub_id, serial_number, milestone_type, is_public, description, deadline, status)
                               VALUES (%s, %s, %s, %s, FALSE, %s, %s, 'draft')""",
                            (action_id, action_sub_id, next_serial, mtype, desc, dead),
                        )
                        inserted += 1
                        next_serial += 1

            # Apply status from "Needs Attention" to internal milestones
            status_updated = 0
            for action_id, action_sub_id, status in status_pairs:
                cur.execute(
                    "SELECT 1 FROM un80actions.actions WHERE id = %s AND sub_id = %s",
                    (action_id, action_sub_id),
                )
                if not cur.fetchone():
                    continue
                cur.execute(_sql_for_status(status), (action_id, action_sub_id))
                status_updated += cur.rowcount

        conn.commit()
        print(f"\nUpdated {updated} existing internal milestone(s) (description/deadline only; status preserved).")
        print(f"Inserted {inserted} new internal milestone(s).")
        if status_pairs:
            print(f"Applied status from 'Needs Attention' to {status_updated} internal milestone(s).")

    print("Done.")


if __name__ == "__main__":
    main()
