from __future__ import annotations

from typing import Iterable, Optional, Sequence, Tuple
import pandas as pd

from db.connection import get_conn  # assumes you expose a pooled conn context manager


UPSERT_APPROVED_USERS = """
INSERT INTO approved_users (email, entity_id, role, lead_id)
VALUES (%s, %s, %s, %s)
ON CONFLICT (email) DO UPDATE
SET
  entity_id = EXCLUDED.entity_id,
  role      = EXCLUDED.role,
  lead_id   = EXCLUDED.lead_id
"""


REQUIRED_COLS = ("email", "entity_id", "role")
ALL_COLS = ("email", "entity_id", "role", "lead_id")


def _normalize_approved_users_df(df: pd.DataFrame) -> pd.DataFrame:
    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"approved_users missing required columns: {missing}")

    work = df.copy()

    # Ensure all expected cols exist (lead_id optional)
    for c in ALL_COLS:
        if c not in work.columns:
            work[c] = None

    work = work[list(ALL_COLS)]

    # Clean strings
    work["email"] = work["email"].astype(str).str.strip().str.lower()
    work["entity_id"] = work["entity_id"].astype(str).str.strip()
    work["role"] = work["role"].astype(str).str.strip()

    # Convert pandas NaN/NaT -> None (so psycopg sends NULL)
    work = work.where(pd.notna(work), None)

    # lead_id: accept None, int, or numeric strings
    def to_int_or_none(x) -> Optional[int]:
        if x is None:
            return None
        # handle floats like 12.0
        if isinstance(x, float):
            return int(x)
        if isinstance(x, int):
            return x
        s = str(x).strip()
        return int(s) if s else None

    work["lead_id"] = work["lead_id"].apply(to_int_or_none)

    return work


def _df_to_rows(df: pd.DataFrame) -> list[Tuple[str, str, str, Optional[int]]]:
    # Convert to python tuples for executemany
    rows = list(df.itertuples(index=False, name=None))
    # Type cast for clarity/type checkers
    return [
        (str(e), str(ent), str(r), (lid if lid is None else int(lid)))
        for e, ent, r, lid in rows
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
