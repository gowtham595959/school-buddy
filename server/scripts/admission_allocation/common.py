from __future__ import annotations

import json
import os
import re
from typing import Any, Callable

import psycopg2

INSERT_SQL = """
INSERT INTO admissions_allocation_history (
  school_id, entry_year, school_urn, la_slug,
  round_order, round_code, round_label, profile_heading,
  line_items, data_source_url, statistics_page_url, updated_at
) VALUES (
  %s, %s, %s, %s,
  %s, %s, %s, %s,
  %s::jsonb, %s, %s, NOW()
)
ON CONFLICT (school_id, entry_year, round_code) DO UPDATE SET
  school_urn = EXCLUDED.school_urn,
  la_slug = EXCLUDED.la_slug,
  round_order = EXCLUDED.round_order,
  round_label = EXCLUDED.round_label,
  profile_heading = EXCLUDED.profile_heading,
  line_items = EXCLUDED.line_items,
  data_source_url = EXCLUDED.data_source_url,
  statistics_page_url = EXCLUDED.statistics_page_url,
  updated_at = NOW()
"""


def get_db_url() -> str | None:
    return os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")


def norm_name_key(raw: str) -> str:
    s = re.sub(r"\s+", " ", (raw or "").replace("\n", " ").strip()).lower()
    s = re.sub(r"[^a-z0-9\s]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_school_maps(cur, extra_aliases: dict[str, str] | None = None) -> dict[str, tuple[int, str, str]]:
    base_aliases = {
        "the royal grammar school": "The Royal Grammar School, High Wycombe",
        "the royal latin school": "Royal Latin School",
    }
    if extra_aliases:
        base_aliases = {**base_aliases, **extra_aliases}
    cur.execute("SELECT id, name, school_code FROM schools")
    by_key: dict[str, tuple[int, str, str]] = {}
    for sid, name, urn in cur.fetchall():
        if not name:
            continue
        key = norm_name_key(name)
        by_key[key] = (int(sid), name, str(urn or ""))
    for alias_key, canonical in base_aliases.items():
        ck = norm_name_key(canonical)
        if ck in by_key:
            by_key[alias_key] = by_key[ck]
    return by_key


def resolve_school(
    raw_name: str,
    by_key: dict[str, tuple[int, str, str]],
    extra_aliases: dict[str, str] | None = None,
):
    k = norm_name_key(raw_name)
    if k in by_key:
        return by_key[k]
    if extra_aliases and k in extra_aliases:
        return by_key.get(norm_name_key(extra_aliases[k]))
    return None


def touch_refresh_log(cur, slug: str) -> None:
    cur.execute(
        """
        UPDATE data_source_refresh_log
        SET last_run_at = NOW(), updated_at = NOW()
        WHERE slug = %s
        """,
        (slug,),
    )


def ensure_refresh_log(
    cur,
    slug: str,
    title: str,
    source_urls: list[dict[str, str]],
    script_hint: str,
    notes: str,
) -> None:
    cur.execute(
        """
        INSERT INTO data_source_refresh_log (slug, domain, title, source_urls, script_hint, notes)
        VALUES (%s, %s, %s, %s::jsonb, %s, %s)
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          source_urls = EXCLUDED.source_urls,
          script_hint = EXCLUDED.script_hint,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        """,
        (slug, "admissions_allocation", title, json.dumps(source_urls), script_hint, notes),
    )


def connect(db_url: str):
    return psycopg2.connect(db_url)


def run_transaction(db_url: str, fn: Callable[[Any], None]) -> None:
    conn = connect(db_url)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            fn(cur)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
