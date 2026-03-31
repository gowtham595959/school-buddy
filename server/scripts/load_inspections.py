#!/usr/bin/env python3
"""
Seed inspections (Ofsted) from inspections_seed_data.py — links to provider + GIAS.

  DATABASE_URL

Usage:
  PYTHONPATH=server/scripts python3 server/scripts/load_inspections.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from inspections_seed_data import ROWS, gias_url, ofsted_provider_url  # noqa: E402

try:
    import psycopg2
except ImportError:
    print("pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if not db_url:
        print("Set DATABASE_URL", file=sys.stderr)
        sys.exit(1)

    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE inspections RESTART IDENTITY CASCADE")
            for (
                school_id,
                school_name,
                urn,
                insp_date,
                overall,
                summary,
                body,
            ) in ROWS:
                cur.execute(
                    """
                    INSERT INTO inspections (
                      school_id, school_name, school_urn,
                      inspection_date, inspection_body, overall_grade, summary,
                      report_url, establishment_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        school_id,
                        school_name,
                        urn,
                        insp_date,
                        body,
                        overall,
                        summary,
                        ofsted_provider_url(urn),
                        gias_url(urn),
                    ),
                )

            cur.execute(
                """
                UPDATE schools s
                SET has_inspection = EXISTS (
                  SELECT 1 FROM inspections i WHERE i.school_id = s.id
                )
                """
            )
        conn.commit()
        print(f"Inserted {len(ROWS)} inspection rows.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
