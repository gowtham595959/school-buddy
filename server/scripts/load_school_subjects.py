#!/usr/bin/env python3
"""
Seed school_subjects from school_subjects_seed_data.py (curriculum lists — legacy).

For official per-subject entry counts from DfE open data, use:
  server/scripts/load_school_subjects_dfe.py
(with ZIPs from ./server/scripts/download_dfe_performance.sh).

Requires: psycopg2-binary, DATABASE_URL

Usage:
  PYTHONPATH=server/scripts python3 server/scripts/load_school_subjects.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from school_subjects_seed_data import SCHOOL_SPECS, src_school_dfe  # noqa: E402

try:
    import psycopg2
except ImportError:
    print("pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

INSERT = """
INSERT INTO school_subjects (
  school_id, school_name, school_urn, sort_order, level,
  subject_name, qualification, entries, notes,
  data_source_url, source_tier, source_urls
) VALUES (
  %s, %s, %s, %s, %s,
  %s, %s, %s, %s,
  %s, %s, %s::jsonb
)
"""


def main() -> None:
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if not db_url:
        print("Set DATABASE_URL", file=sys.stderr)
        sys.exit(1)

    specs = SCHOOL_SPECS()
    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE school_subjects RESTART IDENTITY")
            total = 0
            for spec in specs:
                urls_json = json.dumps(
                    src_school_dfe(spec["school_urn"], spec["slug"], spec["page"])
                )
                primary_url = spec["page"]
                tier = spec["tier"]
                counts = spec.get("counts") or {}
                row_notes = spec.get("row_notes") or {}
                global_note = row_notes.get("_")

                sort = 0
                for name in spec["mandatory"]:
                    cur.execute(
                        INSERT,
                        (
                            spec["school_id"],
                            spec["school_name"],
                            spec["school_urn"],
                            sort,
                            "gcse",
                            name,
                            "GCSE",
                            None,
                            None,
                            primary_url,
                            tier,
                            urls_json,
                        ),
                    )
                    sort += 1
                    total += 1

                opt_list = list(spec["optional"])
                for i, name in enumerate(opt_list):
                    pupils = counts.get(name)
                    row_note = None
                    if global_note and i == 0:
                        row_note = global_note
                    cur.execute(
                        INSERT,
                        (
                            spec["school_id"],
                            spec["school_name"],
                            spec["school_urn"],
                            sort,
                            "gcse",
                            name,
                            "GCSE",
                            pupils,
                            row_note,
                            primary_url,
                            tier,
                            urls_json,
                        ),
                    )
                    sort += 1
                    total += 1

                sort_a = 0
                for subj, qual, ent in spec.get("alevel") or []:
                    cur.execute(
                        INSERT,
                        (
                            spec["school_id"],
                            spec["school_name"],
                            spec["school_urn"],
                            sort_a,
                            "alevel",
                            subj,
                            qual,
                            ent,
                            None,
                            primary_url,
                            tier,
                            urls_json,
                        ),
                    )
                    sort_a += 1
                    total += 1

            cur.execute(
                """
                UPDATE schools s
                SET has_subjects = EXISTS (
                  SELECT 1 FROM school_subjects g WHERE g.school_id = s.id
                )
                """
            )
        conn.commit()
        print(f"Inserted {total} school_subjects rows across {len(specs)} schools.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
