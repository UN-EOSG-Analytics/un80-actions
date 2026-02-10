import re
from pathlib import Path

import pandas as pd


EXCEL_PATH = Path("/Users/niklasquendt/UNGP/un80-actions/Action Plan Tracker test.xlsx")
COLUMN_NAME = "Questions on Initial Milestone"
NOTES_COL_NAME = "Notes on Initial Milestone"
ACTION_COL_NAME = "Action No"


def parse_cell(cell_value):
  """
  Parse a mixed-content cell into (date, bullets).

  Expected pattern (from Excel export examples):

  14 Jan:
  - Question 1
  - Question 2

  - Date: taken from the first non-empty line if it looks like "14 Jan:"
  - Bullets: all subsequent non-empty lines (with leading "-" or "•" removed)
  """
  if pd.isna(cell_value):
    return None, []

  text = str(cell_value)

  # Work line-by-line; scan for the first line that looks like a date header,
  # e.g. "21 Jan:" or "4 December:".
  raw_lines = text.splitlines()

  date = None
  bullet_source_lines = raw_lines

  for idx, line in enumerate(raw_lines):
    header_line = line.strip()
    if not header_line:
      continue

    # Match patterns like "14 Jan:" or "4 December:"
    m = re.match(r"^(\\d{1,2})\\s+([A-Za-z]{3,})\\s*:", header_line)
    if m:
      day, month = m.groups()
      date = f"{day} {month}"
      bullet_source_lines = raw_lines[idx + 1 :]  # everything after the header line
      break

  # Extract bullet points from remaining lines
  lines = [line.rstrip() for line in bullet_source_lines]
  bullets = []
  for line in lines:
    stripped = line.strip()
    if not stripped:
      continue
    # Skip visual separators like "-----"
    if re.fullmatch(r"-{3,}", stripped):
      continue
    # Remove common bullet prefixes
    stripped = re.sub(r"^[-•]\\s*", "", stripped)
    bullets.append(stripped)

  return date, bullets


def main():
  if not EXCEL_PATH.exists():
    raise FileNotFoundError(f"Excel file not found at {EXCEL_PATH}")

  # Read the specific sheet that contains the questions.
  # The table (including the column headers) starts on row 5 (1-based),
  # so we tell pandas to use row 5 as the header row (header=4, 0-based).
  df = pd.read_excel(EXCEL_PATH, sheet_name="Action Tracking", header=4)

  # Be tolerant to casing/spacing differences in the header
  normalized = {col: col.strip().lower() for col in df.columns}

  def find_column(target_name: str) -> str:
    target_norm = target_name.strip().lower()
    for col, norm in normalized.items():
      if norm == target_norm:
        return col
    raise KeyError(
      f"Column '{target_name}' not found in Excel file. "
      f"Available columns: {list(df.columns)}"
    )

  questions_col = find_column(COLUMN_NAME)
  notes_col = find_column(NOTES_COL_NAME)
  action_col = find_column(ACTION_COL_NAME)

  # Apply parser to the questions column
  parsed = df[questions_col].apply(
    lambda x: pd.Series(parse_cell(x), index=["Date", "Bullets"])
  )

  result_df = pd.concat([df, parsed], axis=1)

  # Write JSON output alongside other processed data
  project_root = Path(__file__).resolve().parents[2]
  output_dir = project_root / "data" / "processed"
  output_dir.mkdir(parents=True, exist_ok=True)

  output_path = output_dir / "questions_on_initial_milestone.json"
  # Export only the fields you care about:
  # - Action number
  # - Parsed date
  # - Parsed questions (bullets)
  # - Notes on initial milestones
  export_df = result_df[[action_col, "Date", "Bullets", notes_col]].rename(
    columns={
      action_col: "ActionNo",
      "Bullets": "questions",
      notes_col: "NotesOnInitialMilestones",
    }
  )
  export_df.to_json(
    output_path, orient="records", indent=2, default_handler=str
  )

  print(f"Written parsed questions to {output_path}")


if __name__ == "__main__":
  main()

