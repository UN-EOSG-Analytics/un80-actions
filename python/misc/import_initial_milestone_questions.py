"""
Import initial milestone questions from the pre-parsed JSON file into Postgres.

Source:
- data/processed/questions_on_initial_milestone.json
  Each record has: {"ActionNo": <number>, "Date": <nullable>, "Bullets": [..<lines>..]}

Behaviour:
- For each record, we scan the bullet lines for date headers like "21 Jan:" or "5 Feb:".
- For each date header we create ONE question entry for that action:
  - action_id: taken from ActionNo (integer)
  - action_sub_id: "" (main action)
  - header:
      * "Task Force"          if text mentions "task force" (case-insensitive)
      * "Steering Committee"  if text mentions "steering committee"/"steering commitee"
      * "Unspecified"         otherwise
  - question_date: parsed as YYYY-MM-DD using ASSUMED_YEAR below
  - question: all lines after the date header, joined as markdown bullets ("• ...")

Idempotent:
- Uses a WHERE NOT EXISTS guard, so re-running will not create duplicates.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

from python.db.connection import get_conn


PROJECT_ROOT = Path(__file__).resolve().parents[2]
JSON_PATH = PROJECT_ROOT / "data" / "processed" / "questions_on_initial_milestone.json"

# Assumed year for date-only strings like "21 Jan"
# Adjust if needed.
ASSUMED_YEAR = 2025

MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "sept": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


@dataclass
class QuestionInput:
  action_id: int
  header: str
  # When None, the question will be stored without a specific date.
  question_date: Optional[date]
  question: str
  # Optional notes mapped to the "Notes (on questions)" field (comment column)
  comment: Optional[str]


def parse_date_header(line: str) -> date | None:
  """
  Parse a header line like "21 Jan:" or "5 February:" into a date object.
  Returns None if the line doesn't look like a date header.
  """
  m = re.match(r"^\s*(\d{1,2})\s+([A-Za-z]+)\s*:", line)
  if not m:
    return None
  day_str, month_str = m.groups()
  day = int(day_str)
  month_key = month_str.lower()[:3]
  month = MONTHS.get(month_key)
  if not month:
    return None
  return date(ASSUMED_YEAR, month, day)


def classify_header(text: str) -> str:
  """
  Choose header for the question based on text content.
  """
  lower = text.lower()
  if "task force" in lower:
    return "Task Force"
  if "steering committee" in lower or "steering commitee" in lower:
    return "Steering Committee"
  return "Unspecified"


def extract_questions_from_record(record: dict) -> List[QuestionInput]:
  """
  Turn one JSON record into 0..N QuestionInput entries (one per date header).
  If no date headers are found, we create a single question without a date.
  """
  action_no = record.get("ActionNo")
  if action_no is None:
    return []

  try:
    action_id = int(action_no)
  except (TypeError, ValueError):
    return []

  # After JSON changes, questions are stored under "questions"
  bullets = record.get("questions") or record.get("Bullets") or []
  # Normalise to list of stripped non-empty lines
  raw_lines = [str(line).rstrip() for line in bullets]
  raw_lines = [line for line in raw_lines if line.strip()]

  # Optional notes for this action, used for "Notes (on questions)"
  raw_notes = record.get("NotesOnInitialMilestones")
  notes: Optional[str]
  if raw_notes is None or str(raw_notes).strip() == "":
    notes = None
  else:
    notes = str(raw_notes).strip()

  if not raw_lines:
    # If we have no questions text at all, nothing to import from this record.
    return []

  segments: List[Tuple[date, List[str]]] = []
  current_date: date | None = None
  current_lines: List[str] = []

  for line in raw_lines:
    parsed = parse_date_header(line)
    if parsed:
      # Flush previous segment
      if current_date and current_lines:
        segments.append((current_date, current_lines))
      current_date = parsed
      current_lines = []
    else:
      current_lines.append(line)

  if current_date and current_lines:
    segments.append((current_date, current_lines))

  questions: List[QuestionInput] = []
  if segments:
    # One question per date segment
    for q_date, lines in segments:
      # Build question body: remove leading "-" / "•" and join as markdown bullets
      cleaned_lines: List[str] = []
      for line in lines:
        stripped = line.strip()
        if not stripped:
          continue
        # Skip separators like "------"
        if re.fullmatch(r"-{3,}", stripped):
          continue
        stripped = re.sub(r"^[-•]\\s*", "", stripped)
        cleaned_lines.append(f"• {stripped}")

      if not cleaned_lines:
        continue

      question_text = "\n".join(cleaned_lines)
      header = classify_header(" ".join(cleaned_lines))
      questions.append(
        QuestionInput(
          action_id=action_id,
          header=header,
          question_date=q_date,
          question=question_text,
          comment=notes,
        )
      )
  else:
    # No explicit date headers found; create a single question without a date
    cleaned_lines: List[str] = []
    for line in raw_lines:
      stripped = line.strip()
      if not stripped:
        continue
      if re.fullmatch(r"-{3,}", stripped):
        continue
      stripped = re.sub(r"^[-•]\\s*", "", stripped)
      cleaned_lines.append(f"• {stripped}")

    if cleaned_lines:
      question_text = "\n".join(cleaned_lines)
      header = classify_header(" ".join(cleaned_lines))
      questions.append(
        QuestionInput(
          action_id=action_id,
          header=header,
          question_date=None,
          question=question_text,
          comment=notes,
        )
      )

  return questions


def load_questions_from_json() -> List[QuestionInput]:
  if not JSON_PATH.exists():
    raise FileNotFoundError(f"JSON file not found at {JSON_PATH}")

  data = json.loads(JSON_PATH.read_text())
  all_questions: List[QuestionInput] = []
  for record in data:
    all_questions.extend(extract_questions_from_record(record))
  return all_questions


def main() -> None:
  questions = load_questions_from_json()
  if not questions:
    print("No questions parsed from JSON; nothing to import.")
    return

  print(f"Parsed {len(questions)} question entries from JSON.")

  with get_conn() as conn:
    with conn.cursor() as cur:
      # Use first user as the author for all imported questions
      cur.execute("SELECT id FROM un80actions.users LIMIT 1;")
      row = cur.fetchone()
      if not row:
        raise RuntimeError("No users found in un80actions.users; cannot assign user_id.")
      user_id = row[0]

      inserted = 0

      for q in questions:
        params = {
          "action_id": q.action_id,
          "action_sub_id": "",
          "user_id": user_id,
          "header": q.header,
          "question_date": q.question_date,
          "question": q.question,
          "comment": q.comment,
        }

        # First, if a matching question already exists without a comment,
        # backfill the comment from JSON (but never overwrite existing comments).
        if q.comment:
          cur.execute(
            """
            UPDATE un80actions.action_questions q
            SET comment = %(comment)s
            WHERE q.action_id = %(action_id)s
              AND q.action_sub_id = %(action_sub_id)s
              AND q.header IS NOT DISTINCT FROM %(header)s
              AND q.question_date IS NOT DISTINCT FROM %(question_date)s
              AND q.question = %(question)s
              AND (q.comment IS NULL OR q.comment = '');
            """,
            params,
          )

        cur.execute(
          """
          INSERT INTO un80actions.action_questions (
            action_id,
            action_sub_id,
            user_id,
            header,
            subtext,
            question_date,
            question,
            content_review_status,
            milestone_id,
            comment
          )
          SELECT
            %(action_id)s,
            %(action_sub_id)s,
            %(user_id)s,
            %(header)s,
            NULL,
            %(question_date)s,
            %(question)s,
            'needs_review'::un80actions.content_review_status,
            NULL,
            %(comment)s
          WHERE NOT EXISTS (
            SELECT 1
            FROM un80actions.action_questions q
            WHERE q.action_id = %(action_id)s
              AND q.action_sub_id = %(action_sub_id)s
              AND q.header IS NOT DISTINCT FROM %(header)s
              AND q.question_date IS NOT DISTINCT FROM %(question_date)s
              AND q.question = %(question)s
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

  print(f"Inserted {inserted} new questions into un80actions.action_questions.")


if __name__ == "__main__":
  main()

