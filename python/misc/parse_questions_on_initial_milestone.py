"""
Parse the "Questions on Initial Milestone" column from the Action Plan Excel
and produce a structured JSON file with one event / submission per row.

Uses the same approach as notes (README in python/tables/06-questions-notes):
- Extract dates via regex and parse with pandas.to_datetime(..., dayfirst=True).
- Split each cell on double newline to get multiple events.
- Each segment becomes one row: ActionNo, question_date (ISO), question, notes.

Output: data/processed/questions_on_initial_milestone.json
  [
    { "ActionNo": 14, "question_date": "2025-01-21", "question": "...", "notes": "..." },
    ...
  ]
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import List, Optional, Tuple

import pandas as pd


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
EXCEL_PATH = PROJECT_ROOT / "Action Plan Tracker test.xlsx"
SHEET_NAME = "Action Tracking"

ACTION_COL_NAME = "Action No"
QUESTIONS_COL_NAME = "Questions on Initial Milestone"
NOTES_COL_NAME = "Notes on Initial Milestone"

ASSUMED_YEAR = 2025


# ---------------------------------------------------------------------------
# Parsing helpers (same logic as parse_notes_from_task_force)
# ---------------------------------------------------------------------------

def split_segments(cell_value: str) -> List[str]:
    """Split a cell into segments on double newline."""
    text = str(cell_value)
    segments = re.split(r"\n\s*\n+", text)
    return [seg.strip() for seg in segments if seg.strip()]


def parse_date_from_text(text: str) -> Optional[pd.Timestamp]:
    """Extract first date-like token and parse with pandas.to_datetime."""
    m = re.search(r"\b(\d{1,2}\s+[A-Za-z]{3,})\b", text)
    if not m:
        m = re.search(r"\b(\d{1,2}\s+[A-Za-z]{4,})\b", text)
    if not m:
        return None
    date_str = m.group(1)
    candidate = f"{date_str} {ASSUMED_YEAR}"
    ts = pd.to_datetime(candidate, dayfirst=True, errors="coerce")
    if pd.isna(ts):
        return None
    return ts


def extract_date_and_body(segment: str) -> Tuple[Optional[str], str]:
    """Extract question_date (ISO) and body from a segment."""
    segment = segment.strip()
    if not segment:
        return None, ""

    ts = parse_date_from_text(segment)
    question_date: Optional[str] = (
        ts.normalize().date().isoformat() if ts is not None else None
    )

    lines = segment.splitlines()
    if ts is not None:
        first_idx = None
        for i, line in enumerate(lines):
            if line.strip():
                first_idx = i
                break
        if first_idx is not None:
            first_line = lines[first_idx]
            if re.search(r"\b\d{1,2}\s+[A-Za-z]{3,}\b", first_line) or re.search(
                r"\b\d{1,2}\s+[A-Za-z]{4,}\b", first_line
            ):
                body_lines = lines[first_idx + 1 :]
            else:
                body_lines = lines
        else:
            body_lines = lines
    else:
        body_lines = lines

    body = "\n".join(l for l in body_lines).strip()
    return question_date, body


def find_column(df: pd.DataFrame, target_name: str) -> str:
    """Find a column by case-insensitive, trimmed name (ignores trailing dots, e.g. 'Action No.')."""
    normalized = {col: col.strip().lower().rstrip(".") for col in df.columns}
    target_norm = target_name.strip().lower().rstrip(".")
    for col, norm in normalized.items():
        if norm == target_norm:
            return col
    raise KeyError(
        f"Column '{target_name}' not found in Excel file. "
        f"Available columns: {list(df.columns)}"
    )


def main() -> None:
    if not EXCEL_PATH.exists():
        raise FileNotFoundError(f"Excel file not found at {EXCEL_PATH}")

    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME, header=4)

    action_col = find_column(df, ACTION_COL_NAME)
    questions_col = find_column(df, QUESTIONS_COL_NAME)
    notes_col = find_column(df, NOTES_COL_NAME)

    rows = []

    for _, row in df.iterrows():
        action_no = row.get(action_col)
        if pd.isna(action_no):  # Skip only if empty (Excel should have Action No in every row)
            continue

        try:
            action_id = int(action_no)
        except (TypeError, ValueError):
            continue

        questions_cell = row.get(questions_col)
        notes_cell = row.get(notes_col)
        notes_value = None if pd.isna(notes_cell) else str(notes_cell).strip()
        if notes_value == "":
            notes_value = None

        if pd.isna(questions_cell) or str(questions_cell).strip() == "":
            rows.append(
                {
                    "ActionNo": action_id,
                    "question_date": None,
                    "question": None,
                    "notes": notes_value,
                }
            )
            continue

        for segment in split_segments(str(questions_cell)):
            question_date, body = extract_date_and_body(segment)
            if not body:
                continue
            rows.append(
                {
                    "ActionNo": action_id,
                    "question_date": question_date,
                    "question": body,
                    "notes": notes_value,
                }
            )

    output_dir = PROJECT_ROOT / "data" / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "questions_on_initial_milestone.json"

    pd.DataFrame(rows).to_json(
        output_path, orient="records", indent=2, date_format="iso"
    )

    print(f"Wrote {len(rows)} question rows to {output_path}")


if __name__ == "__main__":
    main()
