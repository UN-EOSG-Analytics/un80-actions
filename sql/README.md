-- Master tables
entities (id TEXT PK, entity_long)
leads (id SERIAL PK, entity_id FK, name UNIQUE)

-- Many-to-many join tables
action_entities (action_id, entity_id) 
action_leads (action_id, lead_id)
work_package_leads (work_package_id, lead_id)


This is the standard normalized relational approach for many-to-many relationships.

Alternative: PostgreSQL Array Columns
If you want to denormalize for simpler queries (trade-off: harder to maintain referential integrity):

Keep your current normalized schema because:

✅ Referential integrity (FK constraints)
✅ Easy to filter "all actions for entity DPPA"
✅ Easy to update entity/lead info in one place
✅ Standard SQL practice for reporting/dashboards
✅ Prevents typos/duplicates in entity/lead names


For the Python ETL:

Parse JSON arrays
Split action_entities string by "; "
Bulk insert into join tables



---

# Auth

Authentication flow:

Admin adds entries to approved_users table (email, entity, role, optional lead)
User requests magic link with their email
System checks if email exists in approved_users
If yes, generates token and creates/updates users record with pre-defined settings
If no, denies access