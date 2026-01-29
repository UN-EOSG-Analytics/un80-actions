import os


POSTGRES_DSN = (
    f"host={os.environ['AZURE_POSTGRES_HOST']} "
    f"port={os.environ.get('AZURE_POSTGRES_PORT', '5432')} "
    f"dbname={os.environ.get('AZURE_POSTGRES_DB', 'postgres')} "
    f"user={os.environ['AZURE_POSTGRES_USER']} "
    f"password={os.environ['AZURE_POSTGRES_PASSWORD']} "
    "sslmode=require"
)
