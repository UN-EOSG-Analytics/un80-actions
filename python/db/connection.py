# Single, reusable connection helper

from psycopg_pool import ConnectionPool
from .config import POSTGRES_DSN


_pool = ConnectionPool(
    conninfo=POSTGRES_DSN,
    min_size=1,
    max_size=5,
    open=True,
)


def get_conn():
    with _pool.connection() as conn:
        yield conn
