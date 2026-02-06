"""
Push UN80 Actions data to PostgreSQL database.

This script upserts:
1. Workstreams
2. Work packages
3. Actions
4. Work package leads and focal points
5. Action leads, focal points, member persons, support persons, and member entities

Usage:
    uv run python python/tables/03-actions/03-push_actions_postgres.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

from python.db.connection import get_conn

# Load processed actions data
parquet_path = Path("data") / "processed" / "actions.parquet"
df_actions = pd.read_parquet(parquet_path)

print(f"Loaded {len(df_actions):,} actions from Parquet")
print(f"Columns: {list(df_actions.columns)}")


# Convert NaN to None for database compatibility
def clean_value(val):
    """Convert NaN/NaT to None, preserve lists and other values"""
    if pd.isna(val):
        return None
    if isinstance(val, (list, np.ndarray)):
        return list(val) if len(val) > 0 else []
    return val


# Clean all columns
df_clean = df_actions.copy()
for col in df_clean.columns:
    if col not in [
        "action_leads",
        "action_focal_points",
        "action_member_persons",
        "action_support_persons",
        "action_member_entities",
        "work_package_leads",
        "work_package_focal_points",
    ]:
        df_clean[col] = df_clean[col].apply(clean_value)

print(f"Processing {len(df_clean):,} actions")

# Extract unique workstreams
workstreams = df_clean[["workstream_id"]].drop_duplicates().dropna()
workstreams["workstream_title"] = None  # Can be populated if available in data
workstream_rows = [
    (row["workstream_id"], row["workstream_title"]) for _, row in workstreams.iterrows()
]

print(f"Found {len(workstream_rows)} unique workstreams")

# Extract unique work packages
work_packages = df_clean[
    ["work_package_id", "workstream_id", "work_package_title", "work_package_goal"]
].drop_duplicates()
work_packages = work_packages[work_packages["work_package_id"].notna()]
work_package_rows = [
    (
        int(row["work_package_id"]),
        row["workstream_id"],
        row["work_package_title"],
        row["work_package_goal"],
    )
    for _, row in work_packages.iterrows()
]

print(f"Found {len(work_package_rows)} unique work packages")

# Prepare actions data (main table - milestones excluded, will be loaded separately)
action_rows = []
for _, row in df_clean.iterrows():
    action_rows.append(
        (
            int(row["id"]),
            str(row["sub_id"]) if pd.notna(row["sub_id"]) and row["sub_id"] else "",
            int(row["work_package_id"]) if pd.notna(row["work_package_id"]) else None,
            row["indicative_action"] if pd.notna(row["indicative_action"]) else None,
            row.get("sub_action") if pd.notna(row.get("sub_action")) else None,
            str(row["document_paragraph_number"])
            if pd.notna(row.get("document_paragraph_number"))
            else None,
            row.get("document_paragraph_text")
            if pd.notna(row.get("document_paragraph_text"))
            else None,
            row.get("scope_definition")
            if pd.notna(row.get("scope_definition"))
            else None,
            row.get("legal_considerations")
            if pd.notna(row.get("legal_considerations"))
            else None,
            row.get("proposal_advancement_scenario")
            if pd.notna(row.get("proposal_advancement_scenario"))
            else None,
            row.get("un_budgets") if pd.notna(row.get("un_budgets")) else None,
            bool(row.get("is_big_ticket", False)),
            bool(row.get("needs_member_state_engagement", False)),
            row.get("tracking_status")
            if pd.notna(row.get("tracking_status"))
            else None,
            row.get("public_action_status")
            if pd.notna(row.get("public_action_status"))
            else None,
            row.get("action_record_id")
            if pd.notna(row.get("action_record_id"))
            else None,
        )
    )

print(f"Prepared {len(action_rows)} action records")

# Prepare relationship data
work_package_leads_links = []
work_package_focal_points_links = []
action_leads_links = []
action_focal_points_links = []
action_member_persons_links = []
action_support_persons_links = []
action_member_entities_links = []

for _, row in df_clean.iterrows():
    action_id = int(row["id"])
    action_sub_id = (
        str(row["sub_id"]) if pd.notna(row["sub_id"]) and row["sub_id"] else ""
    )
    wp_id = int(row["work_package_id"]) if pd.notna(row["work_package_id"]) else None

    # Work package leads
    if (
        wp_id
        and "work_package_leads" in row
        and isinstance(row["work_package_leads"], (list, np.ndarray))
    ):
        for lead in row["work_package_leads"]:
            if lead:
                work_package_leads_links.append((wp_id, lead))

    # Work package focal points
    if (
        wp_id
        and "work_package_focal_points" in row
        and isinstance(row["work_package_focal_points"], (list, np.ndarray))
    ):
        for email in row["work_package_focal_points"]:
            if email:
                work_package_focal_points_links.append((wp_id, email.strip().lower()))

    # Action leads
    if "action_leads" in row and isinstance(row["action_leads"], (list, np.ndarray)):
        for lead in row["action_leads"]:
            if lead:
                action_leads_links.append((action_id, action_sub_id, lead))

    # Action focal points
    if "action_focal_points" in row and isinstance(
        row["action_focal_points"], (list, np.ndarray)
    ):
        for email in row["action_focal_points"]:
            if email:
                action_focal_points_links.append(
                    (action_id, action_sub_id, email.strip().lower())
                )

    # Action member persons
    if "action_member_persons" in row and isinstance(
        row["action_member_persons"], (list, np.ndarray)
    ):
        for email in row["action_member_persons"]:
            if email:
                action_member_persons_links.append(
                    (action_id, action_sub_id, email.strip().lower())
                )

    # Action support persons
    if "action_support_persons" in row and isinstance(
        row["action_support_persons"], (list, np.ndarray)
    ):
        for email in row["action_support_persons"]:
            if email:
                action_support_persons_links.append(
                    (action_id, action_sub_id, email.strip().lower())
                )

    # Action member entities
    if "action_member_entities" in row and isinstance(
        row["action_member_entities"], (list, np.ndarray)
    ):
        for entity in row["action_member_entities"]:
            if entity:
                action_member_entities_links.append((action_id, action_sub_id, entity))

# Remove duplicates
work_package_leads_links = list(set(work_package_leads_links))
work_package_focal_points_links = list(set(work_package_focal_points_links))
action_leads_links = list(set(action_leads_links))
action_focal_points_links = list(set(action_focal_points_links))
action_member_persons_links = list(set(action_member_persons_links))
action_support_persons_links = list(set(action_support_persons_links))
action_member_entities_links = list(set(action_member_entities_links))

print(f"\nPrepared relationship data:")
print(f"  - {len(work_package_leads_links)} work package leads")
print(f"  - {len(work_package_focal_points_links)} work package focal points")
print(f"  - {len(action_leads_links)} action leads")
print(f"  - {len(action_focal_points_links)} action focal points")
print(f"  - {len(action_member_persons_links)} action member persons")
print(f"  - {len(action_support_persons_links)} action support persons")
print(f"  - {len(action_member_entities_links)} action member entities")

# Upsert into database
try:
    with get_conn() as conn:
        with conn.cursor() as cur:
            print("\n--- Starting database upsert ---")

            # Fetch existing emails from approved_users to validate foreign keys
            cur.execute("SELECT email FROM un80actions.approved_users")
            existing_emails = {row[0] for row in cur.fetchall()}
            print(f"\nFound {len(existing_emails)} existing emails in approved_users")

            # Fetch existing leads to validate foreign keys
            cur.execute("SELECT name FROM un80actions.leads")
            existing_leads = {row[0] for row in cur.fetchall()}
            print(f"Found {len(existing_leads)} existing leads")

            # Fetch existing entities to validate foreign keys
            cur.execute("SELECT entity FROM systemchart.entities")
            existing_entities = {row[0] for row in cur.fetchall()}
            print(f"Found {len(existing_entities)} existing entities")

            # Filter relationship links to only include existing references
            def filter_email_links(links, email_idx):
                """Filter links to only include emails that exist in approved_users"""
                filtered = [
                    link for link in links if link[email_idx] in existing_emails
                ]
                missing = [
                    link[email_idx]
                    for link in links
                    if link[email_idx] not in existing_emails
                ]
                if missing:
                    unique_missing = sorted(set(missing))
                    print(
                        f"  ⚠ Warning: Skipping {len(missing)} links with {len(unique_missing)} missing emails:"
                    )
                    for email in unique_missing[:10]:  # Show first 10
                        print(f"    - {email}")
                    if len(unique_missing) > 10:
                        print(f"    ... and {len(unique_missing) - 10} more")
                return filtered

            def filter_lead_links(links, lead_idx):
                """Filter links to only include leads that exist in leads table"""
                filtered = [link for link in links if link[lead_idx] in existing_leads]
                missing = [
                    link[lead_idx]
                    for link in links
                    if link[lead_idx] not in existing_leads
                ]
                if missing:
                    unique_missing = sorted(set(missing))
                    print(
                        f"  ⚠ Warning: Skipping {len(missing)} links with {len(unique_missing)} missing leads:"
                    )
                    for lead in unique_missing[:10]:
                        print(f"    - {lead}")
                    if len(unique_missing) > 10:
                        print(f"    ... and {len(unique_missing) - 10} more")
                return filtered

            def filter_entity_links(links, entity_idx):
                """Filter links to only include entities that exist in entities table"""
                filtered = [
                    link for link in links if link[entity_idx] in existing_entities
                ]
                missing = [
                    link[entity_idx]
                    for link in links
                    if link[entity_idx] not in existing_entities
                ]
                if missing:
                    unique_missing = sorted(set(missing))
                    print(
                        f"  ⚠ Warning: Skipping {len(missing)} links with {len(unique_missing)} missing entities:"
                    )
                    for entity in unique_missing[:10]:
                        print(f"    - {entity}")
                    if len(unique_missing) > 10:
                        print(f"    ... and {len(unique_missing) - 10} more")
                return filtered

            # Apply filters
            print("\nValidating foreign key references...")
            work_package_leads_links = filter_lead_links(work_package_leads_links, 1)
            work_package_focal_points_links = filter_email_links(
                work_package_focal_points_links, 1
            )
            action_leads_links = filter_lead_links(action_leads_links, 2)
            action_focal_points_links = filter_email_links(action_focal_points_links, 2)
            action_member_persons_links = filter_email_links(
                action_member_persons_links, 2
            )
            action_support_persons_links = filter_email_links(
                action_support_persons_links, 2
            )
            action_member_entities_links = filter_entity_links(
                action_member_entities_links, 2
            )

            print(f"\nFiltered relationship data ready for insert:")
            print(f"  - {len(work_package_leads_links)} work package leads")
            print(
                f"  - {len(work_package_focal_points_links)} work package focal points"
            )
            print(f"  - {len(action_leads_links)} action leads")
            print(f"  - {len(action_focal_points_links)} action focal points")
            print(f"  - {len(action_member_persons_links)} action member persons")
            print(f"  - {len(action_support_persons_links)} action support persons")
            print(f"  - {len(action_member_entities_links)} action member entities")
            print()

            # 1. Upsert workstreams
            if workstream_rows:
                UPSERT_WORKSTREAMS_SQL = """
                INSERT INTO un80actions.workstreams (id, workstream_title)
                VALUES (%s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    workstream_title = COALESCE(EXCLUDED.workstream_title, un80actions.workstreams.workstream_title)
                """
                cur.executemany(UPSERT_WORKSTREAMS_SQL, workstream_rows)
                print(f"✓ Upserted {len(workstream_rows)} workstreams")

            # 2. Upsert work packages
            if work_package_rows:
                UPSERT_WORK_PACKAGES_SQL = """
                INSERT INTO un80actions.work_packages (id, workstream_id, work_package_title, work_package_goal)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    workstream_id = EXCLUDED.workstream_id,
                    work_package_title = EXCLUDED.work_package_title,
                    work_package_goal = EXCLUDED.work_package_goal
                """
                cur.executemany(UPSERT_WORK_PACKAGES_SQL, work_package_rows)
                print(f"✓ Upserted {len(work_package_rows)} work packages")

            # 3. Upsert actions (milestones, notes, updates excluded - loaded separately)
            UPSERT_ACTIONS_SQL = """
            INSERT INTO un80actions.actions (
                id, sub_id, work_package_id, indicative_action, sub_action,
                document_paragraph_number, document_paragraph_text,
                scope_definition, legal_considerations, proposal_advancement_scenario, un_budgets,
                is_big_ticket, needs_member_state_engagement,
                tracking_status, public_action_status, action_record_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id, sub_id) DO UPDATE SET
                work_package_id = EXCLUDED.work_package_id,
                indicative_action = EXCLUDED.indicative_action,
                sub_action = EXCLUDED.sub_action,
                document_paragraph_number = EXCLUDED.document_paragraph_number,
                document_paragraph_text = EXCLUDED.document_paragraph_text,
                scope_definition = EXCLUDED.scope_definition,
                legal_considerations = EXCLUDED.legal_considerations,
                proposal_advancement_scenario = EXCLUDED.proposal_advancement_scenario,
                un_budgets = EXCLUDED.un_budgets,
                is_big_ticket = EXCLUDED.is_big_ticket,
                needs_member_state_engagement = EXCLUDED.needs_member_state_engagement,
                tracking_status = EXCLUDED.tracking_status,
                public_action_status = EXCLUDED.public_action_status,
                action_record_id = EXCLUDED.action_record_id
            """
            cur.executemany(UPSERT_ACTIONS_SQL, action_rows)
            print(f"✓ Upserted {len(action_rows)} actions")

            # 4. Clear and repopulate work package leads
            if work_package_leads_links:
                wp_ids = list(set(link[0] for link in work_package_leads_links))
                cur.execute(
                    "DELETE FROM un80actions.work_package_leads WHERE work_package_id = ANY(%s)",
                    (wp_ids,),
                )
                INSERT_WP_LEADS_SQL = """
                INSERT INTO un80actions.work_package_leads (work_package_id, lead_name)
                VALUES (%s, %s)
                ON CONFLICT (work_package_id, lead_name) DO NOTHING
                """
                cur.executemany(INSERT_WP_LEADS_SQL, work_package_leads_links)
                print(f"✓ Upserted {len(work_package_leads_links)} work package leads")

            # 5. Clear and repopulate work package focal points
            if work_package_focal_points_links:
                wp_ids = list(set(link[0] for link in work_package_focal_points_links))
                cur.execute(
                    "DELETE FROM un80actions.work_package_focal_points WHERE work_package_id = ANY(%s)",
                    (wp_ids,),
                )
                INSERT_WP_FPS_SQL = """
                INSERT INTO un80actions.work_package_focal_points (work_package_id, user_email)
                VALUES (%s, %s)
                ON CONFLICT (work_package_id, user_email) DO NOTHING
                """
                cur.executemany(INSERT_WP_FPS_SQL, work_package_focal_points_links)
                print(
                    f"✓ Upserted {len(work_package_focal_points_links)} work package focal points"
                )

            # 6. Clear and repopulate action leads
            if action_leads_links:
                action_ids = [(link[0], link[1]) for link in action_leads_links]
                unique_actions = list(set(action_ids))
                for action_id, action_sub_id in unique_actions:
                    cur.execute(
                        "DELETE FROM un80actions.action_leads WHERE action_id = %s AND action_sub_id = %s",
                        (action_id, action_sub_id),
                    )
                INSERT_ACTION_LEADS_SQL = """
                INSERT INTO un80actions.action_leads (action_id, action_sub_id, lead_name)
                VALUES (%s, %s, %s)
                ON CONFLICT (action_id, action_sub_id, lead_name) DO NOTHING
                """
                cur.executemany(INSERT_ACTION_LEADS_SQL, action_leads_links)
                print(f"✓ Upserted {len(action_leads_links)} action leads")

            # 7. Clear and repopulate action focal points
            if action_focal_points_links:
                action_ids = [(link[0], link[1]) for link in action_focal_points_links]
                unique_actions = list(set(action_ids))
                for action_id, action_sub_id in unique_actions:
                    cur.execute(
                        "DELETE FROM un80actions.action_focal_points WHERE action_id = %s AND action_sub_id = %s",
                        (action_id, action_sub_id),
                    )
                INSERT_ACTION_FPS_SQL = """
                INSERT INTO un80actions.action_focal_points (action_id, action_sub_id, user_email)
                VALUES (%s, %s, %s)
                ON CONFLICT (action_id, action_sub_id, user_email) DO NOTHING
                """
                cur.executemany(INSERT_ACTION_FPS_SQL, action_focal_points_links)
                print(
                    f"✓ Upserted {len(action_focal_points_links)} action focal points"
                )

            # 8. Clear and repopulate action member persons
            if action_member_persons_links:
                action_ids = [
                    (link[0], link[1]) for link in action_member_persons_links
                ]
                unique_actions = list(set(action_ids))
                for action_id, action_sub_id in unique_actions:
                    cur.execute(
                        "DELETE FROM un80actions.action_member_persons WHERE action_id = %s AND action_sub_id = %s",
                        (action_id, action_sub_id),
                    )
                INSERT_ACTION_MEMBERS_SQL = """
                INSERT INTO un80actions.action_member_persons (action_id, action_sub_id, user_email)
                VALUES (%s, %s, %s)
                ON CONFLICT (action_id, action_sub_id, user_email) DO NOTHING
                """
                cur.executemany(INSERT_ACTION_MEMBERS_SQL, action_member_persons_links)
                print(
                    f"✓ Upserted {len(action_member_persons_links)} action member persons"
                )

            # 9. Clear and repopulate action support persons
            if action_support_persons_links:
                action_ids = [
                    (link[0], link[1]) for link in action_support_persons_links
                ]
                unique_actions = list(set(action_ids))
                for action_id, action_sub_id in unique_actions:
                    cur.execute(
                        "DELETE FROM un80actions.action_support_persons WHERE action_id = %s AND action_sub_id = %s",
                        (action_id, action_sub_id),
                    )
                INSERT_ACTION_SUPPORT_SQL = """
                INSERT INTO un80actions.action_support_persons (action_id, action_sub_id, user_email)
                VALUES (%s, %s, %s)
                ON CONFLICT (action_id, action_sub_id, user_email) DO NOTHING
                """
                cur.executemany(INSERT_ACTION_SUPPORT_SQL, action_support_persons_links)
                print(
                    f"✓ Upserted {len(action_support_persons_links)} action support persons"
                )

            # 10. Clear and repopulate action member entities
            if action_member_entities_links:
                action_ids = [
                    (link[0], link[1]) for link in action_member_entities_links
                ]
                unique_actions = list(set(action_ids))
                for action_id, action_sub_id in unique_actions:
                    cur.execute(
                        "DELETE FROM un80actions.action_member_entities WHERE action_id = %s AND action_sub_id = %s",
                        (action_id, action_sub_id),
                    )
                INSERT_ACTION_ENTITIES_SQL = """
                INSERT INTO un80actions.action_member_entities (action_id, action_sub_id, entity)
                VALUES (%s, %s, %s)
                ON CONFLICT (action_id, action_sub_id, entity) DO NOTHING
                """
                cur.executemany(
                    INSERT_ACTION_ENTITIES_SQL, action_member_entities_links
                )
                print(
                    f"✓ Upserted {len(action_member_entities_links)} action member entities"
                )

            conn.commit()
            print(f"\n✓ Successfully completed all database operations")

except Exception as e:
    print(f"✗ Error uploading actions: {e}")
    raise

print("\nDone!")
