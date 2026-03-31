#!/usr/bin/env python3
"""
Load school_subjects from DfE Explore Education Statistics bulk ZIPs (same sources as
load_school_gcse_dfe.py / load_school_ks5_dfe.py):

  • KS4: subject-school file — one row per (school, subject, qualification) with
    grade == "Total exam entries" and numeric number_achieving.
  • 16–18: institution_subject_and_qualification_results_* — grade == "Total exam entries",
    entries_count numeric; excludes the cohort roll-up row (All subjects / GCE A level).

Default inputs (after ./server/scripts/download_dfe_performance.sh):
  data/dfe-performance/ks4-2024-25_all_files.zip
  data/dfe-performance/a-level-16-18-2024-25_all_files.zip

Replaces all rows in school_subjects (TRUNCATE).

Requires: psycopg2-binary (requests optional if ZIPs are local)

Usage:
  PYTHONPATH=server/scripts python3 server/scripts/load_school_subjects_dfe.py \\
    --database-url postgresql://postgres:postgres@localhost:5432/schoolmap

  # Or explicit ZIP paths:
  python3 server/scripts/load_school_subjects_dfe.py \\
    --database-url ... \\
    --ks4-zip /path/to/ks4-2024-25_all_files.zip \\
    --ks5-zip /path/to/a-level-16-18-2024-25_all_files.zip
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import sys
import zipfile
from pathlib import Path
from typing import Any

KS4_SUBJECT_CSV = "data/202425_subject_school_all_exam_entriesgrades_revised.csv"
KS4_TIME_PERIOD = "202425"
KS5_TIME_PERIOD = "202425"

KS4_DATA_PAGE = (
    "https://explore-education-statistics.service.gov.uk/"
    "find-statistics/key-stage-4-performance/2024-25"
)
KS5_DATA_PAGE = (
    "https://explore-education-statistics.service.gov.uk/"
    "find-statistics/a-level-and-other-16-to-18-results/2024-25"
)

# Fallback download URLs (same release IDs as download_dfe_performance.sh)
KS4_ZIP_URL = (
    "https://content.explore-education-statistics.service.gov.uk/api/releases/"
    "4e06e0e2-d705-462c-bb99-97afa166928c/files"
)
KS5_ZIP_URL = (
    "https://content.explore-education-statistics.service.gov.uk/api/releases/"
    "915999c1-8e2b-412c-811b-272c2f0dcf48/files"
)


def download_zip(url: str) -> bytes:
    import requests

    r = requests.get(url, timeout=300)
    r.raise_for_status()
    return r.content


def find_ks5_subject_csv_names(z: zipfile.ZipFile) -> list[str]:
    out: list[str] = []
    for n in z.namelist():
        n2 = n.replace("\\", "/")
        if (
            n2.startswith("data/")
            and "institution_subject_and_qualification_results_" in n2
            and "value_added" not in n2
        ):
            out.append(n2)
    return sorted(out)


def normalize_subject_label(name: str) -> str:
    """Map DfE wording: 'Other <category> (<detail>)' → '<detail> - Other <category>'."""
    s = (name or "").strip()
    if not re.match(r"^Other\b", s, re.IGNORECASE):
        return s
    m = re.match(r"^Other\s+(.+?)\s+\(([^)]+)\)", s, re.IGNORECASE)
    if m:
        category = m.group(1).strip()
        detail = m.group(2).strip()
        if category and detail:
            return f"{detail} - Other {category}"
    return s


def parse_int_entry(raw: str | None) -> int | None:
    if raw is None:
        return None
    s = raw.strip()
    if s in ("", "z", "x", "c", "v"):
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def format_ks4_subject_name(row: dict[str, str]) -> str:
    subj = (row.get("subject") or "").strip()
    sg = (row.get("subject_discount_group") or "").strip()
    if sg and sg.lower() not in subj.lower():
        out = f"{subj} ({sg})"
    else:
        out = subj
    return normalize_subject_label(out)


def ks4_qualification_label(row: dict[str, str]) -> str:
    qt = (row.get("qualification_type") or "").strip()
    if qt:
        return qt
    return (row.get("qualification_detailed") or "").strip() or "—"


def collect_ks4_rows(
    zip_bytes: bytes,
    urn_to_id: dict[str, int],
    urn_to_name: dict[str, str],
) -> list[dict[str, Any]]:
    """Build insert dicts for level='gcse'."""
    keyed: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        if KS4_SUBJECT_CSV not in z.namelist():
            print(f"Missing {KS4_SUBJECT_CSV} in KS4 ZIP", file=sys.stderr)
            return []
        with z.open(KS4_SUBJECT_CSV) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
            for row in reader:
                if (row.get("geographic_level") or "").strip() != "School":
                    continue
                if (row.get("time_period") or "").strip() != KS4_TIME_PERIOD:
                    continue
                if (row.get("grade") or "").strip() != "Total exam entries":
                    continue
                urn = (row.get("school_urn") or "").strip()
                if urn not in urn_to_id:
                    continue
                n = parse_int_entry(row.get("number_achieving"))
                if n is None:
                    continue
                subj = format_ks4_subject_name(row)
                qual = ks4_qualification_label(row)
                key = (urn, subj, qual, "gcse")
                # De-dupe: keep max entries if duplicate keys (should not happen)
                ex = keyed.get(key)
                if ex is None or n > ex["entries"]:
                    keyed[key] = {
                        "school_id": urn_to_id[urn],
                        "school_urn": urn,
                        "school_name": urn_to_name.get(urn, (row.get("school_name") or "").strip()),
                        "level": "gcse",
                        "subject_name": subj,
                        "qualification": qual,
                        "entries": n,
                    }

    rows = list(keyed.values())
    rows.sort(key=lambda r: (r["school_id"], r["subject_name"].lower(), r["qualification"].lower()))
    return rows


def collect_ks5_rows(
    zip_bytes: bytes,
    urn_to_id: dict[str, int],
    urn_to_name: dict[str, str],
) -> list[dict[str, Any]]:
    keyed: dict[tuple[str, str, str], dict[str, Any]] = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        inner_paths = find_ks5_subject_csv_names(z)
        if not inner_paths:
            print("No institution_subject_and_qualification_results_*.csv in KS5 ZIP", file=sys.stderr)
            return []
        for inner in inner_paths:
            with z.open(inner) as raw:
                reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
                for row in reader:
                    if (row.get("geographic_level") or "").strip() != "School":
                        continue
                    if (row.get("time_period") or "").strip() != KS5_TIME_PERIOD:
                        continue
                    if (row.get("grade") or "").strip() != "Total exam entries":
                        continue
                    urn = (row.get("school_urn") or "").strip()
                    if urn not in urn_to_id:
                        continue
                    n = parse_int_entry(row.get("entries_count"))
                    if n is None:
                        continue
                    subj_raw = (row.get("subject") or "").strip()
                    qd = (row.get("qualification_detailed") or "").strip()
                    if subj_raw == "All subjects":
                        if qd == "GCE A level":
                            continue
                        subj_display = qd or "—"
                    else:
                        subj_display = subj_raw
                    subj_display = normalize_subject_label(subj_display)
                    qual_display = qd or "—"
                    key = (urn, subj_display, qual_display)
                    ex = keyed.get(key)
                    if ex is None or n > ex["entries"]:
                        keyed[key] = {
                            "school_id": urn_to_id[urn],
                            "school_urn": urn,
                            "school_name": urn_to_name.get(urn, (row.get("school_name") or "").strip()),
                            "level": "alevel",
                            "subject_name": subj_display,
                            "qualification": qual_display,
                            "entries": n,
                        }

    rows = list(keyed.values())
    rows.sort(key=lambda r: (r["school_id"], r["subject_name"].lower(), r["qualification"].lower()))
    return rows


def fetch_urn_maps(conn) -> tuple[dict[str, int], dict[str, str]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, TRIM(school_code)::text, name FROM schools
            WHERE school_code IS NOT NULL AND TRIM(school_code) <> ''
            """
        )
        id_map: dict[str, int] = {}
        name_map: dict[str, str] = {}
        for sid, code, name in cur.fetchall():
            u = str(code).strip()
            id_map[u] = sid
            name_map[u] = (name or "").strip() or u
        return id_map, name_map


def build_source_urls_json() -> str:
    return json.dumps(
        [
            {"label": "DfE Key stage 4 performance (2024/25)", "url": KS4_DATA_PAGE},
            {"label": "DfE A level and 16–18 results (2024/25)", "url": KS5_DATA_PAGE},
            {
                "label": "Compare school and college performance (download data)",
                "url": "https://www.compare-school-performance.service.gov.uk/download-data",
            },
        ]
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    root = Path(__file__).resolve().parents[2]
    default_ks4 = root / "data/dfe-performance/ks4-2024-25_all_files.zip"
    default_ks5 = root / "data/dfe-performance/a-level-16-18-2024-25_all_files.zip"
    ap.add_argument("--ks4-zip", type=Path, default=default_ks4)
    ap.add_argument("--ks5-zip", type=Path, default=default_ks5)
    ap.add_argument(
        "--download",
        action="store_true",
        help="Download ZIPs from EES when local files are missing",
    )
    args = ap.parse_args()

    if not args.database_url:
        print("Set --database-url or DATABASE_URL", file=sys.stderr)
        sys.exit(1)

    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("pip install psycopg2-binary", file=sys.stderr)
        sys.exit(1)

    ks4_path: Path = args.ks4_zip
    ks5_path: Path = args.ks5_zip
    if not ks4_path.is_file():
        if args.download:
            print("Downloading KS4 ZIP…")
            ks4_bytes = download_zip(KS4_ZIP_URL)
        else:
            print(f"Missing KS4 ZIP: {ks4_path} (use --download or run download_dfe_performance.sh)", file=sys.stderr)
            sys.exit(1)
    else:
        ks4_bytes = ks4_path.read_bytes()

    if not ks5_path.is_file():
        if args.download:
            print("Downloading KS5 ZIP…")
            ks5_bytes = download_zip(KS5_ZIP_URL)
        else:
            print(f"Missing KS5 ZIP: {ks5_path}", file=sys.stderr)
            sys.exit(1)
    else:
        ks5_bytes = ks5_path.read_bytes()

    conn = psycopg2.connect(args.database_url)
    try:
        urn_to_id, urn_to_name = fetch_urn_maps(conn)
        print(f"Schools with URN: {len(urn_to_id)}")

        gcse_list = collect_ks4_rows(ks4_bytes, urn_to_id, urn_to_name)
        alevel_list = collect_ks5_rows(ks5_bytes, urn_to_id, urn_to_name)
        print(f"KS4 subject entry rows (latest cohort in ZIP): {len(gcse_list)}")
        print(f"16–18 subject entry rows: {len(alevel_list)}")

        urls_json = build_source_urls_json()
        # A level first in sort_order per school so DB order matches UI when sorted by (school_id, sort_order).
        # We assign sort_order 0..n-1 for alevel then n.. for gcse.
        by_school: dict[int, list[dict[str, Any]]] = {}
        for r in alevel_list + gcse_list:
            by_school.setdefault(r["school_id"], []).append(r)

        insert_rows: list[dict[str, Any]] = []
        for sid in sorted(by_school.keys()):
            chunk = by_school[sid]
            for i, r in enumerate(chunk):
                insert_rows.append(
                    {
                        "school_id": r["school_id"],
                        "school_name": r["school_name"],
                        "school_urn": r["school_urn"],
                        "sort_order": i,
                        "level": r["level"],
                        "subject_name": r["subject_name"],
                        "qualification": r["qualification"],
                        "entries": r["entries"],
                        "notes": None,
                        "data_source_url": KS5_DATA_PAGE
                        if r["level"] == "alevel"
                        else KS4_DATA_PAGE,
                        "source_tier": "dfe",
                        "source_urls": urls_json,
                    }
                )

        with conn.cursor() as cur:
            cur.execute("TRUNCATE school_subjects RESTART IDENTITY")
            sql = """
            INSERT INTO school_subjects (
              school_id, school_name, school_urn, sort_order, level,
              subject_name, qualification, entries, notes,
              data_source_url, source_tier, source_urls
            ) VALUES (
              %(school_id)s, %(school_name)s, %(school_urn)s, %(sort_order)s, %(level)s,
              %(subject_name)s, %(qualification)s, %(entries)s, %(notes)s,
              %(data_source_url)s, %(source_tier)s, %(source_urls)s::jsonb
            )
            """
            psycopg2.extras.execute_batch(cur, sql, insert_rows)
            cur.execute(
                """
                UPDATE schools s
                SET has_subjects = EXISTS (
                  SELECT 1 FROM school_subjects x WHERE x.school_id = s.id
                )
                """
            )
        conn.commit()
        print(f"Inserted {len(insert_rows)} school_subjects rows across {len(by_school)} schools.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
