"""
Push UN80 Actions data to PostgreSQL database.

Usage:
    uv run python python/03-push_to_postgres.py
"""

import os
from pathlib import Path
from urllib.parse import quote_plus

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

# Verify required environment variables
required_vars = [
    "POSTGRES_HOST",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
]
missing_vars = [var for var in required_vars if not os.getenv(var)]
if missing_vars:
    raise ValueError(
        f"Missing required environment variables: {', '.join(missing_vars)}"
    )

# Load data
csv_path = Path("data") / "output" / "actions.csv"
if not csv_path.exists():
    raise FileNotFoundError(f"Actions CSV not found: {csv_path}")

df = pd.read_csv(csv_path)
print(f"Loaded {len(df):,} actions from CSV")
print(f"Columns: {list(df.columns)}")

# Create database connection
user = quote_plus(os.getenv("POSTGRES_USER", ""))
password = quote_plus(os.getenv("POSTGRES_PASSWORD", ""))
host = os.getenv("POSTGRES_HOST", "")
port = os.getenv("POSTGRES_PORT", "5432")
db = os.getenv("POSTGRES_DB", "")

# Determine SSL mode (default to require for production, disable for local dev)
ssl_mode = os.getenv("POSTGRES_SSL_MODE", "prefer")

# First, connect to default 'postgres' database to create the target database if needed
default_connection_string = (
    f"postgresql://{user}:{password}@{host}:{port}/postgres?sslmode={ssl_mode}"
)
default_engine = create_engine(default_connection_string)

try:
    with default_engine.begin() as conn:
        # Check if database exists
        result = conn.exec_driver_sql(
            f"SELECT 1 FROM pg_database WHERE datname = '{db}';"
        )
        if not result.fetchone():
            print(f"Database '{db}' does not exist. Creating...")
            conn.exec_driver_sql(f"CREATE DATABASE {db};")
            print(f"✓ Created database '{db}'")
        else:
            print(f"✓ Database '{db}' already exists")
except Exception as e:
    print(f"Note: Could not check/create database: {e}")
finally:
    default_engine.dispose()

# Now connect to the target database
connection_string = (
    f"postgresql://{user}:{password}@{host}:{port}/{db}?sslmode={ssl_mode}"
)
engine = create_engine(connection_string)
print(f"Connected to Postgres: {host}/{db}")

try:
    # TODO: Map Airtable columns to un80actions schema tables
    # This depends on your final Airtable structure and schema design

    # Example structure (adjust based on your actual data):
    # - actions_df: Data for un80actions.actions table
    # - action_leads_df: Data for un80actions.action_leads table
    # - action_entities_df: Data for un80actions.action_entities table

    # For now, export to a staging table for inspection
    with engine.begin() as conn:
        # Create staging table if needed
        conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS un80actions.actions_staging (
                id SERIAL PRIMARY KEY,
                data JSONB
            );
        """)
        conn.exec_driver_sql("DELETE FROM un80actions.actions_staging;")

    # Insert raw data into staging table for initial review
    df.to_sql(
        "actions_staging",
        engine,
        if_exists="append",
        index=False,
        schema="un80actions",
        method="multi",
        chunksize=100,
    )
    print(f"✓ Successfully pushed {len(df):,} actions to un80actions.actions_staging")
    print("\nNext steps:")
    print("1. Review data structure and mapping in staging table")
    print("2. Update script to properly parse Airtable fields")
    print("3. Map to production tables (actions, action_leads, action_entities, etc.)")

except Exception as e:
    print(f"✗ Error: {e}")
    raise
finally:
    engine.dispose()
