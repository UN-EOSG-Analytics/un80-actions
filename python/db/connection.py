# Simple connection helper without pooling

from contextlib import contextmanager
import psycopg
from .config import DATABASE_URL


@contextmanager
def get_conn():
    """Get a direct connection to the database."""
    conn = psycopg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()
