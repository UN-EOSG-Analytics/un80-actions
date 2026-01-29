from api.airtable import fetch_airtable_table

LEADS_TABLE_ID = "tbl4sybRFswhbZM2v"

df_leads = fetch_airtable_table(table_id=LEADS_TABLE_ID)


df_leads.columns

selected_columns = [
    "name",
    "entity",
]

df_selected = df_leads[selected_columns]
