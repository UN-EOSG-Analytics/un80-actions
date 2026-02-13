"""
Import initial milestone questions from the pre-parsed JSON file into Postgres.

Source:
- data/processed/questions_on_initial_milestone.json
  One event per row: {"ActionNo": <int>, "question_date": "YYYY-MM-DD"|null, "question": "...", "notes": "..."|null}
  (Produced by parse_questions_on_initial_milestone.py using the same logic as notes: split on double newline, regex + pd.to_datetime.)

Behaviour:
- Each record is one question. We insert into action_questions with:
  - action_id from ActionNo, action_sub_id "", header from question_date (see DATE_TO_HEADER),
  - question_date and question from the record, comment from notes.

Header by date (committee type): 21 Jan, 28 Jan, 5/12/18/23 Feb → Task Force; 23 Jan, 25 Feb → Steering Committee.

Idempotent:
- Uses a WHERE NOT EXISTS guard, so re-running will not create duplicates.
- Use --clear to delete all existing questions before importing (full refresh).
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import List, Optional

from python.db.connection import get_conn

# Committee type (header) by calendar date (month, day). Matches UN80 meeting schedule.
DATE_TO_HEADER: dict[tuple[int, int], str] = {
    (12, 17): "Task Force",
    (1, 7): "Task Force",
    (1, 14): "Task Force",
    (1, 21): "Task Force",
    (1, 23): "Steering Committee",
    (1, 28): "Task Force",
    (2, 5): "Task Force",
    (2, 12): "Task Force",
    (2, 18): "Task Force",
    (2, 23): "Task Force",
    (2, 25): "Steering Committee",
}


PROJECT_ROOT = Path(__file__).resolve().parents[2]
JSON_PATH = PROJECT_ROOT / "data" / "processed" / "questions_on_initial_milestone.json"


@dataclass
class QuestionInput:
  action_id: int
  header: str
  # When None, the question will be stored without a specific date.
  question_date: Optional[date]
  question: str
  # Optional notes mapped to the "Notes (on questions)" field (comment column)
  comment: Optional[str]


def record_to_question(record: dict) -> Optional[QuestionInput]:
  """Turn one JSON record (one event per row) into a single QuestionInput, or None if invalid."""
  action_no = record.get("ActionNo")
  if action_no is None:
    return None
  try:
    action_id = int(action_no)
  except (TypeError, ValueError):
    return None

  question = (record.get("question") or "").strip()
  if not question:
    return None

  raw_date = record.get("question_date")
  question_date: Optional[date] = None
  if raw_date:
    try:
      question_date = date.fromisoformat(str(raw_date).split("T")[0])
    except ValueError:
      pass

  raw_notes = record.get("notes") or record.get("NotesOnInitialMilestones")
  notes: Optional[str] = None
  if raw_notes is not None and str(raw_notes).strip():
    notes = str(raw_notes).strip()

  header = "Unspecified"
  if question_date is not None:
    key = (question_date.month, question_date.day)
    header = DATE_TO_HEADER.get(key, "Unspecified")

  return QuestionInput(
    action_id=action_id,
    header=header,
    question_date=question_date,
    question=question,
    comment=notes,
  )


def load_questions_from_json() -> List[QuestionInput]:
  if not JSON_PATH.exists():
    raise FileNotFoundError(f"JSON file not found at {JSON_PATH}")

  data = json.loads(JSON_PATH.read_text())
  questions: List[QuestionInput] = []
  for record in data:
    q = record_to_question(record)
    if q is not None:
      questions.append(q)
  return questions


def main() -> None:
  parser = argparse.ArgumentParser(description="Import questions from JSON into action_questions.")
  parser.add_argument(
    "--clear",
    action="store_true",
    help="Delete all existing rows in action_questions before importing (full refresh).",
  )
  args = parser.parse_args()

  questions = load_questions_from_json()
  if not questions:
    print("No questions parsed from JSON; nothing to import.")
    return

  print(f"Parsed {len(questions)} question entries from JSON.")

  with get_conn() as conn:
    with conn.cursor() as cur:
      if args.clear:
        cur.execute("DELETE FROM un80actions.action_questions;")
        deleted = cur.rowcount
        print(f"Cleared {deleted} existing question(s) from action_questions.")

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

