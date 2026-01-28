from api.airtable import fetch_airtable_table

USER_TABLE_ID = "tbl38pZDARtrQKbHT"

df = fetch_airtable_table(table_id=USER_TABLE_ID)
