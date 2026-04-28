"""Convert the extracted CSV table into actions_progress.json schema."""

import csv
import json
from collections import OrderedDict
from pathlib import Path

INPUT = Path(__file__).parent.parent / "data/input/un80_action_dashboard_extracted_table_with_action_progress(in).csv"
OUTPUT = Path(__file__).parent.parent / "public/data/actions_progress.json"

def main():
    with open(INPUT, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    wp_map: dict[int, dict] = {}

    for row in rows:
        wp_raw = row["Work package number"].strip()
        # Handle combined WPs like "WP6, WP12" — use the first number
        first_wp = wp_raw.split(",")[0].strip()
        wp_num = int(first_wp.replace("WP", ""))

        action_number = row["Action number"].strip()
        action_text = row["Action text / scope"].strip()
        source_grouping = row["Source action grouping"].strip()
        next_steps = row["Next steps per action"].strip()
        progress_per_action = row["Progress per action"].strip()

        if wp_num not in wp_map:
            wp_map[wp_num] = {
                "workPackageNumber": wp_num,
                "workPackageName": row["Work package title"].strip(),
                "objective": row["Objective"].strip(),
                "progressToDate": row["Progress per work package"].strip(),
                "_actions": [],
            }

        wp_map[wp_num]["_actions"].append({
            "actionNumber": action_number,
            "actionText": action_text,
            "sourceGrouping": source_grouping,
            "nextSteps": next_steps,
            "progressPerAction": progress_per_action,
        })

    result = []
    for wp_num in sorted(wp_map):
        wp = wp_map[wp_num]
        actions = wp.pop("_actions")

        # Build howWeGetThere grouped by source action grouping
        seen_groups: dict[str, dict] = {}
        for a in actions:
            group_key = a["sourceGrouping"]
            if group_key not in seen_groups:
                seen_groups[group_key] = {
                    "actionNumbers": group_key,
                    "text": a["actionText"],
                }

        # Build nextStepsAndDecisions grouped by source action grouping
        seen_next: dict[str, dict] = {}
        for a in actions:
            group_key = a["sourceGrouping"]
            if group_key not in seen_next and a["nextSteps"]:
                seen_next[group_key] = {
                    "actionNumbers": group_key,
                    "text": a["nextSteps"],
                }

        # Build progressPerAction entries
        progress_entries = []
        for a in actions:
            if a["progressPerAction"]:
                progress_entries.append({
                    "actionNumbers": a["actionNumber"],
                    "text": a["progressPerAction"],
                })

        ordered = OrderedDict()
        ordered["workPackageNumber"] = wp["workPackageNumber"]
        ordered["workPackageName"] = wp["workPackageName"]
        ordered["objective"] = wp["objective"]
        ordered["howWeGetThere"] = list(seen_groups.values())
        ordered["progressToDate"] = wp["progressToDate"]
        ordered["progressPerAction"] = progress_entries
        ordered["nextStepsAndDecisions"] = list(seen_next.values())

        result.append(ordered)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(result)} work packages to {OUTPUT}")

if __name__ == "__main__":
    main()
