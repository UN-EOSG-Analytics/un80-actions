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

## Questions on Initial Milestone

Same logic (split on double newline, regex + `pd.to_datetime` for dates) is used for:

- **Parser:** `python/misc/parse_questions_on_initial_milestone.py`  
  → `data/processed/questions_on_initial_milestone.json` (one row per question: `ActionNo`, `question_date`, `question`, `notes`).
- **Importer:** `python/misc/import_initial_milestone_questions.py`  
  → inserts into `un80actions.action_questions` (idempotent).