"""
Import "Questions on Final Milestone" (parsed from Excel) into action_questions
for use in the Action modal Questions tab.

Source:
- data/processed/questions_on_final_milestone.json
  Each record:
    {
      "ActionNo": <int>,
      "question_date": "YYYY-MM-DD" | null,
      "question": "<text>"
    }

Behaviour:
- For each record, match ActionNo to actions.id (main action, sub_id = '').
- Insert with header always "Unspecified", question_date from record (null = no date),
  question text. Optionally link to the action's Final milestone (milestone_id).
- Idempotent: if an identical question already exists, it will not be inserted again.
- Use --clear to delete only questions that came from this import (header=Unspecified
  and matching content) or run without --clear for additive import only.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import List, Optional

from python.db.connection import get_conn


PROJECT_ROOT = Path(__file__).resolve().parents[3]
JSON_PATH = PROJECT_ROOT / "data" / "processed" / "questions_on_final_milestone.json"

HEADER_FINAL_MILESTONE = "Unspecified"


@dataclass
class FinalMilestoneQuestion:
    action_id: int
    question_date: Optional[date]
    question: str
    header: str = HEADER_FINAL_MILESTONE


def load_questions_from_json() -> List[FinalMilestoneQuestion]:
    if not JSON_PATH.exists():
        raise FileNotFoundError(f"JSON file not found at {JSON_PATH}")

    data = json.loads(JSON_PATH.read_text())
    questions: List[FinalMilestoneQuestion] = []

    for rec in data:
        action_no = rec.get("ActionNo")
        if action_no is None:
            continue
        try:
            action_id = int(action_no)
        except (TypeError, ValueError):
            continue

        question = (rec.get("question") or "").strip()
        if not question:
            continue

        raw_date = rec.get("question_date")
        question_date: Optional[date] = None
        if raw_date:
            try:
                question_date = date.fromisoformat(str(raw_date).split("T")[0])
            except ValueError:
                pass

        questions.append(
            FinalMilestoneQuestion(
                action_id=action_id,
                question_date=question_date,
                question=question,
                header=HEADER_FINAL_MILESTONE,
            )
        )

    return questions


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import Questions on Final Milestone from JSON into action_questions."
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Delete existing questions with header 'Unspecified' before importing (full refresh for this source).",
    )
    args = parser.parse_args()

    questions = load_questions_from_json()
    if not questions:
        print("No Questions on Final Milestone parsed from JSON; nothing to import.")
        return

    print(f"Parsed {len(questions)} question entries from JSON.")

    with get_conn() as conn:
        with conn.cursor() as cur:
            if args.clear:
                # Remove only questions that have header 'Unspecified' (our import source)
                cur.execute(
                    "DELETE FROM un80actions.action_questions WHERE header = %s;",
                    (HEADER_FINAL_MILESTONE,),
                )
                deleted = cur.rowcount
                print(f"Cleared {deleted} existing question(s) with header '{HEADER_FINAL_MILESTONE}'.")

            cur.execute("SELECT id FROM un80actions.users LIMIT 1;")
            row = cur.fetchone()
            if not row:
                raise RuntimeError(
                    "No users found in un80actions.users; cannot assign user_id."
                )
            user_id = row[0]

            inserted = 0

            for q in questions:
                # Resolve final milestone for this action (optional link)
                cur.execute(
                    """
                    SELECT id FROM un80actions.action_milestones
                    WHERE action_id = %s AND action_sub_id = '' AND milestone_type = 'final'
                    LIMIT 1;
                    """,
                    (q.action_id,),
                )
                milestone_row = cur.fetchone()
                milestone_id = milestone_row[0] if milestone_row else None

                params = {
                    "action_id": q.action_id,
                    "action_sub_id": "",
                    "user_id": user_id,
                    "header": q.header,
                    "question_date": q.question_date,
                    "question": q.question,
                    "milestone_id": milestone_id,
                }

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
                      milestone_id
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
                      %(milestone_id)s
                    WHERE NOT EXISTS (
                      SELECT 1
                      FROM un80actions.action_questions aq
                      WHERE aq.action_id = %(action_id)s
                        AND aq.action_sub_id = %(action_sub_id)s
                        AND aq.header IS NOT DISTINCT FROM %(header)s
                        AND aq.question_date IS NOT DISTINCT FROM %(question_date)s
                        AND aq.question = %(question)s
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
