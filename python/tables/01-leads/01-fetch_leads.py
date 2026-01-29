from pathlib import Path
from api.airtable import fetch_airtable_table
from utils.utils import export_dataframe

LEADS_TABLE_ID = "tbl4sybRFswhbZM2v"

df_leads = fetch_airtable_table(table_id=LEADS_TABLE_ID)
df_leads = df_leads.sort_values("name").reset_index(drop=True)


selected_columns = [
    "name",
    "entity",
]

df_leads = df_leads[selected_columns]


output_dir = Path("data") / "processed"
export_dataframe(df_leads, "df_leads", output_dir)
