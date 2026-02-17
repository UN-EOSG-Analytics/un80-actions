# Questions & notes from Excel (Action Plan Tracker)

Shared approach for parsing note/question columns:

- **Extract date** via regex and `pandas.to_datetime(..., dayfirst=True)`  
  https://pandas.pydata.org/docs/reference/api/pandas.to_datetime.html
- **Split** each cell on double newline (`\n\s*\n+`) → one segment per “event”.
- **One event per row** in the output JSON; align with DB schema; upsert via Python (see `python/db/` imports).

## Scripts in this folder

| Output JSON | Parser | Importer |
|-------------|--------|----------|
| `notes_from_task_force.json` | `parse_notes_from_task_force.py` | `import_notes_from_task_force.py` |
| `notes_fp_working_team.json` | `parse_notes_fp_working_team.py` | `import_notes_fp_working_team.py` |
| `questions_on_final_milestone.json` | `parse_questions_final_milestone.py` | `import_questions_final_milestone.py` |

## Questions on Initial Milestone

Same logic (split on double newline, regex + `pd.to_datetime` for dates) is used for:

- **Parser:** `python/misc/parse_questions_on_initial_milestone.py`  
  → `data/processed/questions_on_initial_milestone.json` (one row per question: `ActionNo`, `question_date`, `question`, `notes`).
- **Importer:** `python/misc/import_initial_milestone_questions.py`  
  → inserts into `un80actions.action_questions` (idempotent).

## Questions on Final Milestone

- **Parser:** `parse_questions_final_milestone.py`  
  → reads column "Questions on Final Milestone" from `Action Plan Tracker test.xlsx`, sheet "Action Tracking"; outputs `data/processed/questions_on_final_milestone.json` (one row per question: `ActionNo`, `question_date` or null, `question`).
- **Importer:** `import_questions_final_milestone.py`  
  → inserts into `un80actions.action_questions` with header always "Unspecified", question_date from record (null = no date), optionally linked to the action’s Final milestone (idempotent; use `--clear` to remove all questions with header "Unspecified" before re-import).