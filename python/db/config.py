import os

from dotenv import load_dotenv

load_dotenv()

# Verify required environment variables
required_vars = [
    "AZURE_POSTGRES_HOST",
    "AZURE_POSTGRES_USER",
    "AZURE_POSTGRES_PASSWORD",
]
missing_vars = [var for var in required_vars if not os.getenv(var)]
if missing_vars:
    raise ValueError(
        f"Missing required environment variables: {', '.join(missing_vars)}\n"
        f"Please create a .env file in the project root with:\n"
        f"AZURE_POSTGRES_HOST=your-host.postgres.database.azure.com\n"
        f"AZURE_POSTGRES_USER=your-username\n"
        f"AZURE_POSTGRES_PASSWORD=your-password\n"
        f"AZURE_POSTGRES_DB=postgres (optional, defaults to 'postgres')\n"
        f"AZURE_POSTGRES_PORT=5432 (optional, defaults to '5432')"
    )

POSTGRES_DSN = (
    f"host={os.environ['AZURE_POSTGRES_HOST']} "
    f"port={os.environ.get('AZURE_POSTGRES_PORT', '5432')} "
    f"dbname={os.environ.get('AZURE_POSTGRES_DB', 'postgres')} "
    f"user={os.environ['AZURE_POSTGRES_USER']} "
    f"password={os.environ['AZURE_POSTGRES_PASSWORD']} "
    "sslmode=require"
)
