"""
Parse the "Notes from Task Force" column from the Action Plan Excel and
produce a structured JSON file with one event / submission per row.

Approach (following README in this folder):
- Extract dates via regex and parse them with pandas.to_datetime.
- Split each cell on a *double* newline (blank line) to get multiple events.
- Each segment becomes one row, aligned with the schema (ActionNo, note_date, content).

Output:
- data/processed/notes_from_task_force.json
  [
    {
      "ActionNo": 14,
      "note_date": "2025-01-21",
      "content": "First block of notes …"
    },
    ...
  ]

This script only prepares structured data. A separate script can upsert these
rows into Postgres (e.g. into action_notes) using the existing db helpers.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import List, Optional, Tuple

import pandas as pd


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[3]
EXCEL_PATH = PROJECT_ROOT / "Action Plan Tracker test.xlsx"
SHEET_NAME = "Action Tracking"

ACTION_COL_NAME = "Action No"
NOTES_COL_NAME = "Notes from Task Force"

# Year to assume when parsing dates like "21 Jan"
ASSUMED_YEAR = 2025


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def split_segments(cell_value: str) -> List[str]:
    """
    Split a notes cell into logical segments using a blank line separator.

    We treat a *double* newline (possibly with whitespace) as a separator:
    "...\n\n...\n\n..." -> 3 segments.
    """
    text = str(cell_value)
    segments = re.split(r"\n\s*\n+", text)
    return [seg.strip() for seg in segments if seg.strip()]


def parse_date_from_text(text: str) -> Optional[pd.Timestamp]:
    """
    Extract the first occurrence of a date-like token (e.g. '21 Jan', '5 February')
    and parse it into a pandas Timestamp using pandas.to_datetime.

    Returns None if no date could be parsed.
    """
    # Look for patterns like "21 Jan" or "5 February"
    m = re.search(r"\b(\d{1,2}\s+[A-Za-z]{3,})\b", text)
    if not m:
        m = re.search(r"\b(\d{1,2}\s+[A-Za-z]{4,})\b", text)
    if not m:
        return None

    date_str = m.group(1)
    # Attach an assumed year and let pandas parse it.
    candidate = f"{date_str} {ASSUMED_YEAR}"
    ts = pd.to_datetime(candidate, dayfirst=True, errors="coerce")
    if pd.isna(ts):
        return None
    return ts


def extract_date_and_body(segment: str) -> Tuple[Optional[str], str]:
    """
    Given a text segment, extract:
    - note_date: ISO date string (YYYY-MM-DD) or None
    - body: the remaining text (with leading/trailing whitespace trimmed)

    Strategy:
    - Try to parse a date from the full segment text.
    - If a date is found and appears on a distinct first line, drop that line
      from the body; otherwise keep the whole segment as body.
    """
    segment = segment.strip()
    if not segment:
        return None, ""

    ts = parse_date_from_text(segment)
    note_date: Optional[str] = ts.normalize().date().isoformat() if ts is not None else None

    lines = segment.splitlines()
    if ts is not None:
        # If the first non-empty line contains the date, drop it from the body.
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
    return note_date, body


# ---------------------------------------------------------------------------
# Main ETL
# ---------------------------------------------------------------------------

def find_column(df: pd.DataFrame, target_name: str) -> str:
    """Find a column by case-insensitive, trimmed name."""
    normalized = {col: col.strip().lower() for col in df.columns}
    target_norm = target_name.strip().lower()
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

    # Table starts on row 5 (1-based), so header=4 (0-based).
    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME, header=4)

    action_col = find_column(df, ACTION_COL_NAME)
    notes_col = find_column(df, NOTES_COL_NAME)

    rows = []

    for _, row in df.iterrows():
        action_no = row.get(action_col)
        if pd.isna(action_no):
            continue

        try:
            action_id = int(action_no)
        except (TypeError, ValueError):
            continue

        cell = row.get(notes_col)
        if pd.isna(cell) or str(cell).strip() == "":
            continue

        for segment in split_segments(str(cell)):
            note_date, body = extract_date_and_body(segment)
            if not body:
                continue
            rows.append(
                {
                    "ActionNo": action_id,
                    "note_date": note_date,
                    "content": body,
                }
            )

    # Export JSON
    output_dir = PROJECT_ROOT / "data" / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "notes_from_task_force.json"

    pd.DataFrame(rows).to_json(
        output_path, orient="records", indent=2, date_format="iso"
    )

    print(f"Wrote {len(rows)} Task Force note rows to {output_path}")


if __name__ == "__main__":
    main()

