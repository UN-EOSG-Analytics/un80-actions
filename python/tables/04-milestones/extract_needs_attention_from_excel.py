"""
Extract "Needs attention" from Excel and update internal milestone status in the database.

Reads:
  - Excel: sheet "UN80 Actions - ALL ITEMS", columns NO., Sub-number, "Needs attention"
  - Header row is row 4 (0-indexed: 3)

Maps Excel status text to the milestone dropdown status (internal milestones only;
public milestones are not updated):
  - "Draft" / "No submission" → draft
  - "Needs Attention" / "Needs attention" → needs_attention
  - "Attention to timeline" → attention_to_timeline
  - "Confirmation needed" → confirmation_needed
  - "Approved" → approved
  - "Finalized" → finalized
  - "Needs OLA review" → needs_ola_review
  - "Reviewed by OLA" → reviewed_by_ola

Usage:
  uv run python python/tables/04-milestones/extract_needs_attention_from_excel.py [path_to_excel]
  Default path: /Users/niklasquendt/Downloads/UN80_Actions_List-2_for extraction.xlsx

Dry run (no DB writes):
  DRY_RUN=1 uv run python python/tables/04-milestones/extract_needs_attention_from_excel.py [path]
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Optional

import pandas as pd

# Project root and db
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from python.db.connection import get_conn

DEFAULT_EXCEL_PATH = Path("/Users/niklasquendt/Downloads/UN80_Actions_List-2_for extraction.xlsx")
SHEET_NAME = "UN80 Actions - ALL ITEMS"
HEADER_ROW = 3  # 0-indexed

# Excel "Needs attention" value (normalized) -> internal status name
STATUS_MAP = {
    "draft": "draft",
    "no submission": "draft",
    "needs attention": "needs_attention",
    "attention to timeline": "attention_to_timeline",
    "confirmation needed": "confirmation_needed",
    "approved": "approved",
    "finalized": "finalized",
    "needs ola review": "needs_ola_review",
    "reviewed by ola": "reviewed_by_ola",
    "in review": "draft",  # treat as draft for bulk import
}


def normalize_status_text(raw: str) -> Optional[str]:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = re.sub(r"\s+", " ", str(raw).strip()).lower()
    return s if s else None


def excel_status_to_internal(normalized: str) -> Optional[str]:
    return STATUS_MAP.get(normalized)


def load_excel(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Excel file not found: {path}")
    df = pd.read_excel(path, sheet_name=SHEET_NAME, header=HEADER_ROW)
    for col in ["NO.", "Needs attention"]:
        if col not in df.columns:
            raise ValueError(f"Missing column '{col}' in sheet '{SHEET_NAME}'. Columns: {list(df.columns)}")
    return df


def extract_action_status_pairs(df: pd.DataFrame) -> list[tuple[int, str, str]]:
    """Returns list of (action_id, action_sub_id, internal_status)."""
    out: list[tuple[int, str, str]] = []
    for _, row in df.iterrows():
        no = row.get("NO.")
        if pd.isna(no):
            continue
        try:
            action_id = int(no)
        except (TypeError, ValueError):
            continue
        sub = row.get("Sub-number")
        if pd.isna(sub) or sub == "":
            action_sub_id = ""
        else:
            action_sub_id = str(sub).strip()
        raw = row.get("Needs attention")
        norm = normalize_status_text(raw)
        if norm is None:
            continue
        internal = excel_status_to_internal(norm)
        if internal is None:
            # Skip unknown status (or could default to draft)
            continue
        out.append((action_id, action_sub_id, internal))
    return out


# SQL: set one status and clear others (internal milestones only).
# We update by (action_id, action_sub_id) and is_public = false.
def sql_for_status(status: str) -> str:
    if status == "draft":
        return """
    UPDATE un80actions.action_milestones
    SET is_draft = TRUE,
        is_approved = FALSE,
        needs_attention = FALSE,
        needs_ola_review = FALSE,
        reviewed_by_ola = FALSE,
        finalized = FALSE,
        attention_to_timeline = FALSE,
        confirmation_needed = FALSE,
        content_review_status = 'needs_review'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "finalized":
        return """
    UPDATE un80actions.action_milestones
    SET finalized = TRUE,
        is_draft = FALSE,
        is_approved = FALSE,
        needs_attention = FALSE,
        needs_ola_review = FALSE,
        reviewed_by_ola = FALSE,
        attention_to_timeline = FALSE,
        confirmation_needed = FALSE,
        content_review_status = 'approved'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "attention_to_timeline":
        return """
    UPDATE un80actions.action_milestones
    SET attention_to_timeline = TRUE,
        is_draft = FALSE,
        is_approved = FALSE,
        needs_attention = FALSE,
        needs_ola_review = FALSE,
        reviewed_by_ola = FALSE,
        finalized = FALSE,
        confirmation_needed = FALSE,
        content_review_status = 'approved'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "confirmation_needed":
        return """
    UPDATE un80actions.action_milestones
    SET confirmation_needed = TRUE,
        is_draft = FALSE,
        is_approved = FALSE,
        needs_attention = FALSE,
        needs_ola_review = FALSE,
        reviewed_by_ola = FALSE,
        finalized = FALSE,
        attention_to_timeline = FALSE,
        content_review_status = 'approved'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "needs_attention":
        return """
    UPDATE un80actions.action_milestones
    SET needs_attention = TRUE,
        is_draft = FALSE,
        is_approved = FALSE,
        needs_ola_review = FALSE,
        reviewed_by_ola = FALSE,
        finalized = FALSE,
        attention_to_timeline = FALSE,
        confirmation_needed = FALSE,
        content_review_status = 'needs_review'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "approved":
        return """
    UPDATE un80actions.action_milestones
    SET is_approved = TRUE,
        is_draft = FALSE,
        needs_attention = FALSE,
        needs_ola_review = FALSE,
        reviewed_by_ola = FALSE,
        finalized = FALSE,
        attention_to_timeline = FALSE,
        confirmation_needed = FALSE,
        content_review_status = 'approved'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "needs_ola_review":
        return """
    UPDATE un80actions.action_milestones
    SET needs_ola_review = TRUE,
        is_draft = FALSE,
        is_approved = FALSE,
        needs_attention = FALSE,
        reviewed_by_ola = FALSE,
        finalized = FALSE,
        attention_to_timeline = FALSE,
        confirmation_needed = FALSE,
        content_review_status = 'needs_review'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    if status == "reviewed_by_ola":
        return """
    UPDATE un80actions.action_milestones
    SET reviewed_by_ola = TRUE,
        is_draft = FALSE,
        is_approved = FALSE,
        needs_attention = FALSE,
        needs_ola_review = FALSE,
        finalized = FALSE,
        attention_to_timeline = FALSE,
        confirmation_needed = FALSE,
        content_review_status = 'approved'::un80actions.content_review_status
    WHERE action_id = %s AND (action_sub_id IS NOT DISTINCT FROM %s) AND is_public = FALSE
    """
    raise ValueError(f"Unknown status: {status}")


def apply_updates(rows: list[tuple[int, str, str]], dry_run: bool) -> None:
    if dry_run:
        for action_id, action_sub_id, status in rows:
            print(f"  [DRY RUN] would set action_id={action_id} sub_id={repr(action_sub_id)} -> {status}")
        return
    with get_conn() as conn:
        with conn.cursor() as cur:
            for action_id, action_sub_id, status in rows:
                sql = sql_for_status(status)
                params = (action_id, action_sub_id)
                cur.execute(sql, params)
                n = cur.rowcount
                if n > 0:
                    print(f"  Updated {n} internal milestone(s) for action ({action_id}, {repr(action_sub_id)}) -> {status}")
        conn.commit()


def main() -> None:
    path = DEFAULT_EXCEL_PATH
    if len(sys.argv) >= 2:
        path = Path(sys.argv[1])
    dry_run = os.environ.get("DRY_RUN", "").strip().lower() in ("1", "true", "yes")

    print(f"Reading: {path}")
    print(f"Sheet: {SHEET_NAME}, header row: {HEADER_ROW}")
    df = load_excel(path)
    rows = extract_action_status_pairs(df)
    print(f"Extracted {len(rows)} action/status rows (internal milestones only will be updated).")
    if not rows:
        print("Nothing to do.")
        return

    # Summary by status
    from collections import Counter
    for status, count in Counter(s for (_, _, s) in rows).most_common():
        print(f"  {status}: {count}")

    if dry_run:
        print("\nDRY RUN — no database changes:")
    else:
        print("\nApplying updates to database (internal milestones only)...")
    apply_updates(rows, dry_run=dry_run)
    print("Done.")


if __name__ == "__main__":
    main()
