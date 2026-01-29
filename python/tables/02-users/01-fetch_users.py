from pathlib import Path

from api.airtable import fetch_airtable_table
from utils.utils import convert_linked_columns_to_lists, export_dataframe

USER_TABLE_ID = "tbl38pZDARtrQKbHT"

df_users = fetch_airtable_table(table_id=USER_TABLE_ID)
df_users = df_users.sort_values("email").reset_index(drop=True)


selected_columns = [
    "email",
    "full_name",
    "entity",
    "lead_positions",
    "user_status",
    "user_role",
]
df_users = df_users[selected_columns]

# Convert linked columns to lists
linked_columns = ["lead_positions"]
df_users = convert_linked_columns_to_lists(df_users, linked_columns)

output_dir = Path("data") / "processed"
export_dataframe(df_users, "df_users", output_dir)
