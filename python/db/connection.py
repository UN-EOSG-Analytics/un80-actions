# Simple connection helper without pooling

from contextlib import contextmanager
import psycopg
from .config import POSTGRES_DSN


@contextmanager
def get_conn():
    """Get a direct connection to the database."""
    conn = psycopg.connect(POSTGRES_DSN)
    try:
        yield conn
    finally:
        conn.close()
