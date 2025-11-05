# https://docs.github.com/en/rest?apiVersion=2022-11-28
# https://github.com/settings/tokens


import base64
import os
from datetime import datetime

import requests
from dotenv import load_dotenv
from pathlib import Path

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
url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{FILE_PATH}"
headers = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json"}

response = requests.get(url, headers=headers)
sha = response.json()["sha"] if response.status_code == 200 else None

# Push file
data = {
    "message": f"Update data {datetime.now().strftime('%Y-%m-%d %H:%M')}",
    "content": encoded,
}
if sha:
    data["sha"] = sha  # Required for updates

response = requests.put(url, headers=headers, json=data)

if response.status_code in [200, 201]:
    print("✓ File pushed successfully")
else:
    print(f"✗ Error: {response.json()}")
