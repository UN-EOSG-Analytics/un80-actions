import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError(
        "Missing required environment variable: DATABASE_URL\n"
        "Please create a .env file in the project root with:\n"
        "DATABASE_URL=postgresql://your-username:your-password@your-host.postgres.database.azure.com:5432/un80actions"
    )
