import json
import os
import string

import pandas as pd
from dotenv import load_dotenv
from pyairtable import Api

# Load environment variables from .env file
load_dotenv()

ACTIONS_TABLE_ID = "tblizWEdO7EsfFGlz"

# Initialize Airtable API connection
api = Api(os.environ["AIRTABLE_API_KEY"])

table = api.table(base_id=os.environ["AIRTABLE_BASE_ID"], table_name=ACTIONS_TABLE_ID)

# Docs: https://pyairtable.readthedocs.io/en/stable/api.html?highlight=cell_format#pyairtable.Table.all
records = table.all(cell_format="string",user_locale="en-ca", time_zone="America/New_York")

records

with open("airtable_records.json", "w") as f:
    json.dump(records, f, indent=2)
