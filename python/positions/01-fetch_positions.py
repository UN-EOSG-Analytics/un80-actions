from api.airtable import fetch_airtable_table

USER_TABLE_ID = "tbl38pZDARtrQKbHT"

df_users = fetch_airtable_table(table_id=USER_TABLE_ID)
df_users = df_users.sort_values("email")
