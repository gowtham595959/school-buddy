#!/usr/bin/env python3
"""
Load DfE 16–18 destination measures (institution-level CSV) into school_1618_destinations.

Source: Explore Education Statistics — "16-18 destination measures", all files ZIP.
File pattern inside ZIP: data/ees_ks5_inst_<time_period>.csv (e.g. 202223).

Headline row per school (preferred):
  geographic_level=School, cohort_level_group=Level 3, cohort_level=Total,
  breakdown_topic=Total, breakdown=Total, data_type=Percentage
Fallback if no Level 3 row:
  cohort_level_group=Total (same other filters).

Cohort year: last two digits of time_period + 2000 (202223 → cohort_end_year 2023).

URN scope: DISTINCT schools.school_code (same as GCSE / KS5 loaders).

Requires: psycopg2-binary, requests

  python3 server/scripts/load_school_1618_destinations_dfe.py --database-url postgresql://postgres:postgres@localhost:5432/schoolmap
"""
from __future__ import annotations

import argparse
import csv
import io
import os
import re
import sys
import zipfile
from typing import Any

import requests

# "Download all data" from a 16–18 destination measures release (verify UUID after each publication).
DESTINATIONS_RELEASE_ZIP = (
    "https://content.explore-education-statistics.service.gov.uk/api/releases/"
    "785c3016-6174-49c1-960b-b39788066682/files"
)

INST_CSV_PATTERN = re.compile(r"^data/ees_ks5_inst_(\d{6})\.csv$")

# Explore landing pages by leavers academic year label slug (extend when new years load)
DATA_SOURCE_URL_BY_COHORT_END_YEAR: dict[int, str] = {
    2023: "https://explore-education-statistics.service.gov.uk/find-statistics/16-18-destination-measures/2022-23",
}


def download_zip(url: str) -> bytes:
    r = requests.get(url, timeout=300)
    r.raise_for_status()
    return r.content


def cohort_end_year_from_time_period(tp: str) -> int | None:
    s = (tp or "").strip()
    if len(s) != 6 or not s.isdigit():
        return None
    return 2000 + int(s[4:6])


def academic_year_label_from_time_period(tp: str) -> str | None:
    s = (tp or "").strip()
    if len(s) != 6 or not s.isdigit():
        return None
    y1, y2 = s[:4], s[4:6]
    return f"{y1}/{y2}"


def fetch_school_urns_from_db(conn) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT TRIM(school_code) FROM schools
            WHERE school_code IS NOT NULL AND TRIM(school_code) <> ''
            """
        )
        return {str(row[0]).strip() for row in cur.fetchall() if row[0]}


def fetch_urn_to_school_id(conn) -> dict[str, int]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, school_code FROM schools
            WHERE school_code IS NOT NULL AND TRIM(school_code) <> ''
            """
        )
        return {str(row[1]).strip(): row[0] for row in cur.fetchall()}


def refresh_destinations_drawer_flags(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE schools s
            SET has_results_destinations = EXISTS (
              SELECT 1 FROM school_1618_destinations d
              WHERE d.school_id = s.id
                 OR (
                   d.school_id IS NULL
                   AND s.school_code IS NOT NULL
                   AND TRIM(d.school_urn) = TRIM(s.school_code)
                 )
            )
            """
        )


def _pct(val: str | None) -> float | None:
    if val is None:
        return None
    v = str(val).strip()
    if v in ("", "c", "z", "x", "LOWCOV", "lowcov"):
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _int(val: str | None) -> int | None:
    if val is None:
        return None
    v = str(val).strip()
    if v in ("", "c", "z", "x"):
        return None
    try:
        return int(float(v))
    except ValueError:
        return None


def discover_inst_csvs(z: zipfile.ZipFile) -> list[tuple[str, str]]:
    """[(zip_inner_path, time_period), ...]"""
    out: list[tuple[str, str]] = []
    for name in z.namelist():
        m = INST_CSV_PATTERN.match(name.replace("\\", "/"))
        if m:
            out.append((name, m.group(1)))
    out.sort(key=lambda x: x[1])
    return out


def pick_headline_row(
    rows: list[dict[str, str]], prefer_l3: bool = True
) -> dict[str, str] | None:
    """Prefer Level 3 Total/Total Percentage Revised/Provisional."""
    def ok_pct(r: dict[str, str]) -> bool:
        if r.get("geographic_level") != "School":
            return False
        if r.get("cohort_level") != "Total" or r.get("breakdown_topic") != "Total":
            return False
        if r.get("breakdown") != "Total":
            return False
        if r.get("data_type") != "Percentage":
            return False
        if (r.get("version") or "") not in ("Revised", "Provisional"):
            return False
        return True

    if prefer_l3:
        for r in rows:
            if r.get("cohort_level_group") == "Level 3" and ok_pct(r):
                return r
    for r in rows:
        if r.get("cohort_level_group") == "Total" and ok_pct(r):
            return r
    return None


def row_to_record(
    r: dict[str, str], time_period: str, urn: str, urn_to_id: dict[str, int]
) -> dict[str, Any]:
    cy = cohort_end_year_from_time_period(time_period)
    label = academic_year_label_from_time_period(time_period)
    if cy is None or not label:
        raise ValueError(f"Bad time_period {time_period!r}")

    qual = r.get("cohort_level_group") or ""

    return {
        "school_urn": urn,
        "school_id": urn_to_id.get(urn),
        "cohort_end_year": cy,
        "academic_year_label": label,
        "time_period": time_period,
        "school_name": (r.get("school_name") or "").strip() or None,
        "la_name": (r.get("la_name") or "").strip() or None,
        "version": (r.get("version") or "").strip() or None,
        "qualification_breakdown": qual or None,
        "leavers_student_count": _int(r.get("cohort")),
        "pct_overall": _pct(r.get("overall")),
        "pct_education": _pct(r.get("education")),
        "pct_he": _pct(r.get("he")),
        "pct_fe": _pct(r.get("fe")),
        "pct_other_education": _pct(r.get("other_edu")),
        "pct_apprenticeship": _pct(r.get("appren")),
        "pct_employment": _pct(r.get("all_work")),
        "pct_not_sustained": _pct(r.get("all_notsust")),
        "pct_unknown": _pct(r.get("all_unknown")),
        "data_source_url": DATA_SOURCE_URL_BY_COHORT_END_YEAR.get(cy),
    }


def extract_rows_from_zip(
    zip_bytes: bytes, urns: set[str], urn_to_id: dict[str, int]
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        csvs = discover_inst_csvs(z)
        if not csvs:
            print("No ees_ks5_inst_*.csv in ZIP", file=sys.stderr)
            return out
        for path, tp in csvs:
            with z.open(path) as f:
                text = io.TextIOWrapper(f, encoding="utf-8", newline="")
                reader = csv.DictReader(text)
                by_urn: dict[str, list[dict[str, str]]] = {}
                for row in reader:
                    u = (row.get("school_urn") or "").strip()
                    if u not in urns:
                        continue
                    by_urn.setdefault(u, []).append(row)
            for urn, urows in by_urn.items():
                hr = pick_headline_row(urows, prefer_l3=True)
                if not hr:
                    hr = pick_headline_row(urows, prefer_l3=False)
                if not hr:
                    continue
                try:
                    out.append(row_to_record(hr, tp, urn, urn_to_id))
                except ValueError as e:
                    print(f"Skip {urn} {tp}: {e}", file=sys.stderr)
    return out


def upsert_rows(conn, rows: list[dict[str, Any]]) -> None:
    import psycopg2.extras

    sql = """
    INSERT INTO school_1618_destinations (
      school_urn, school_id, cohort_end_year, academic_year_label, time_period,
      school_name, la_name, version, qualification_breakdown, leavers_student_count,
      pct_overall, pct_education, pct_he, pct_fe, pct_other_education,
      pct_apprenticeship, pct_employment, pct_not_sustained, pct_unknown,
      data_source_url
    ) VALUES (
      %(school_urn)s, %(school_id)s, %(cohort_end_year)s, %(academic_year_label)s, %(time_period)s,
      %(school_name)s, %(la_name)s, %(version)s, %(qualification_breakdown)s, %(leavers_student_count)s,
      %(pct_overall)s, %(pct_education)s, %(pct_he)s, %(pct_fe)s, %(pct_other_education)s,
      %(pct_apprenticeship)s, %(pct_employment)s, %(pct_not_sustained)s, %(pct_unknown)s,
      %(data_source_url)s
    )
    ON CONFLICT (school_urn, cohort_end_year) DO UPDATE SET
      school_id = EXCLUDED.school_id,
      academic_year_label = EXCLUDED.academic_year_label,
      time_period = EXCLUDED.time_period,
      school_name = EXCLUDED.school_name,
      la_name = EXCLUDED.la_name,
      version = EXCLUDED.version,
      qualification_breakdown = EXCLUDED.qualification_breakdown,
      leavers_student_count = EXCLUDED.leavers_student_count,
      pct_overall = EXCLUDED.pct_overall,
      pct_education = EXCLUDED.pct_education,
      pct_he = EXCLUDED.pct_he,
      pct_fe = EXCLUDED.pct_fe,
      pct_other_education = EXCLUDED.pct_other_education,
      pct_apprenticeship = EXCLUDED.pct_apprenticeship,
      pct_employment = EXCLUDED.pct_employment,
      pct_not_sustained = EXCLUDED.pct_not_sustained,
      pct_unknown = EXCLUDED.pct_unknown,
      data_source_url = EXCLUDED.data_source_url,
      created_at = NOW();
    """
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    args = ap.parse_args()
    if not args.database_url:
        print("Set --database-url or DATABASE_URL", file=sys.stderr)
        sys.exit(1)
    try:
        import psycopg2
    except ImportError:
        print("pip install psycopg2-binary requests", file=sys.stderr)
        sys.exit(1)

    conn = psycopg2.connect(args.database_url)
    try:
        urns = fetch_school_urns_from_db(conn)
        print(f"School URNs from database: {len(urns)}")
        if not urns:
            print("No schools with school_code — nothing to load.", file=sys.stderr)
            sys.exit(1)

        print("Downloading 16–18 destination measures ZIP…")
        z_bytes = download_zip(DESTINATIONS_RELEASE_ZIP)
        urn_to_id = fetch_urn_to_school_id(conn)
        rows = extract_rows_from_zip(z_bytes, urns, urn_to_id)
        print(f"Extracted {len(rows)} school–cohort destination rows")

        if rows:
            upsert_rows(conn, rows)
        refresh_destinations_drawer_flags(conn)
        conn.commit()
        print(
            f"Upserted school_1618_destinations; refreshed has_results_destinations for all schools."
        )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
