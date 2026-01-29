from __future__ import annotations

from typing import Iterable, Optional, Sequence, Tuple
import pandas as pd

from db.connection import get_conn  # assumes you expose a pooled conn context manager


UPSERT_APPROVED_USERS = """
INSERT INTO un80actions.approved_users (email, full_name, system_entity, status, role)
VALUES (%s, %s, %s, %s, %s)
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  system_entity = EXCLUDED.system_entity,
  status = EXCLUDED.status,
  role = EXCLUDED.role
"""


REQUIRED_COLS = ("email", "full_name", "system_entity", "role")
ALL_COLS = ("email", "full_name", "system_entity", "status", "role")


def _normalize_approved_users_df(df: pd.DataFrame) -> pd.DataFrame:
    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"approved_users missing required columns: {missing}")

    work = df.copy()

    # Ensure all expected cols exist (status optional)
    for c in ALL_COLS:
        if c not in work.columns:
            work[c] = None

    work = work[list(ALL_COLS)]

    # Clean strings
    work["email"] = work["email"].astype(str).str.strip().str.lower()
    work["full_name"] = work["full_name"].astype(str).str.strip()
    work["system_entity"] = work["system_entity"].astype(str).str.strip()
    work["role"] = work["role"].astype(str).str.strip()

    # Status is optional
    if "status" in work.columns:
        work["status"] = work["status"].astype(str).str.strip()
        work.loc[work["status"] == "nan", "status"] = None

    # Convert pandas NaN/NaT -> None (so psycopg sends NULL)
    work = work.where(pd.notna(work), None)

    return work


def _df_to_rows(df: pd.DataFrame) -> list[Tuple[str, str, str, Optional[str], str]]:
    # Convert to python tuples for executemany
    rows = list(df.itertuples(index=False, name=None))
    # Type cast for clarity/type checkers
    return [
        (str(e), str(fn), str(se), (st if st is None else str(st)), str(r))
        for e, fn, se, st, r in rows
    ]


def upsert_approved_users_from_df(df: pd.DataFrame, *, chunk_size: int = 2000) -> int:
    """
    Upsert approved_users using (email) unique constraint.
    Returns number of rows attempted (not exact DB rowcount).
    """
    norm = _normalize_approved_users_df(df)
    rows = _df_to_rows(norm)

    if not rows:
        return 0

    total = 0
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Chunking is optional for "hundreds", but keeps this safe if it grows
            for i in range(0, len(rows), chunk_size):
                batch = rows[i : i + chunk_size]
                cur.executemany(UPSERT_APPROVED_USERS, batch)
                total += len(batch)

    return total
