# https://docs.github.com/en/rest?apiVersion=2022-11-28
# https://github.com/settings/tokens


import base64
import os
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get from .env file
TOKEN = os.getenv("GITHUB_TOKEN")
OWNER = "UN-EOSG-Analytics"
REPO = "un80-actions"

data_folder = Path("data")
FILE_PATH = data_folder / "input" / "example.csv"

# Your CSV data
csv_data = """date,value,status
2024-01-01,100,active
2024-01-02,150,active
2024-01-03,200,complete"""

# Encode to base64
encoded = base64.b64encode(csv_data.encode()).decode()

# Get existing file SHA (if updating)
# This handles both create AND update
url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{FILE_PATH}"
headers = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json"}

response = requests.get(url, headers=headers)
sha = response.json()["sha"] if response.status_code == 200 else None

# Push file
# ISO 8601 timestamp (better for sorting/parsing)
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
commit_message = f"chore: automated data update – {timestamp}"

data = {
    "message": commit_message,
    "content": encoded,
}

# Include SHA only if file exists
# Required for updates/overwriting
if sha:
    data["sha"] = sha

response = requests.put(url, headers=headers, json=data)

if response.status_code in [200, 201]:
    print("✓ File pushed successfully")
else:
    print(f"✗ Error: {response.json()}")
