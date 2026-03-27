#!/usr/bin/env python3
"""
Load DfE 16–18 institution performance (A level cohort) into school_ks5_results for every
school in the database with a DfE URN (schools.school_code), when that URN appears in the
open-data CSVs (England; includes partially selective sixth forms, etc.).

Source: Explore Education Statistics — "A level and other 16 to 18 results", all files ZIP.
         CSV: data/institution_performance_202225.csv (multi-year rows; time_period e.g. 202425).

Row filter: geographic_level=School, disadvantage_status=Total, exam_cohort=A level.
Cohort years loaded: 2023–2025 only (matches product tabs).

Grade % A*, A*/A, A*/A/B (entry share, not headcount):
  • Latest release: institution_subject_and_qualification_results_*.csv in the all-files ZIP
    (school-level; typically current academic year / cohort end 2025 only).
  • Previous release (2023–24): all_inst_data.csv — “All subjects” rows, grade_total_entries *
    (A*), A, B, Total (cohort end 2024 / time_period 202324).
  • Cohort end 2023: current DfE all-files ZIPs checked do not ship a school-level subject/qual
    or all_inst extract for 202223; those cells may stay blank until a compatible file exists.

URN scope: DISTINCT schools.school_code (same as GCSE loader).

Requires: psycopg2-binary, requests

  python3 server/scripts/load_school_ks5_dfe.py --database-url postgresql://postgres:postgres@localhost:5432/schoolmap
"""
from __future__ import annotations

import argparse
import csv
import io
import os
import sys
import zipfile
from collections import defaultdict
from typing import Any

import requests

# 16–18 / A level — “download all data” ZIPs (release id from each publication’s data page).
KS5_RELEASE_ZIP_LATEST = (
    "https://content.explore-education-statistics.service.gov.uk/api/releases/"
    "915999c1-8e2b-412c-811b-272c2f0dcf48/files"
)
# Previous publication: includes all_inst_data.csv with school-level A level “All subjects” grades
# for cohort end 2024 (time_period 202324).
KS5_RELEASE_ZIP_2023_24_PUBLICATION = (
    "https://content.explore-education-statistics.service.gov.uk/api/releases/"
    "19157c8c-c75f-4bef-ba68-c3dd3b6d1d96/files"
)

INSTITUTION_PERFORMANCE_CSV = "data/institution_performance_202225.csv"
# Older publication: roll-up of A level grades by institution (not per-subject).
ALL_INST_DATA_CSV = "data/all_inst_data.csv"

MIN_COHORT_END_YEAR = 2023
MAX_COHORT_END_YEAR = 2025

DATA_SOURCE_URL_BY_COHORT_END_YEAR: dict[int, str] = {
    2025: "https://explore-education-statistics.service.gov.uk/find-statistics/a-level-and-other-16-to-18-results/2024-25",
    2024: "https://explore-education-statistics.service.gov.uk/find-statistics/a-level-and-other-16-to-18-results/2023-24",
    2023: "https://explore-education-statistics.service.gov.uk/find-statistics/a-level-and-other-16-to-18-results/2022-23",
    2022: "https://explore-education-statistics.service.gov.uk/find-statistics/a-level-and-other-16-to-18-results/2021-22",
}


def download_zip(url: str) -> bytes:
    r = requests.get(url, timeout=300)
    r.raise_for_status()
    return r.content


def fetch_school_urns_from_db(conn) -> set[str]:
    """URNs for all app schools with a DfE school_code."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT TRIM(school_code) FROM schools
            WHERE school_code IS NOT NULL AND TRIM(school_code) <> ''
            """
        )
        return {str(row[0]).strip() for row in cur.fetchall() if row[0]}


def refresh_ks5_drawer_flags(conn) -> None:
    """Set schools.has_results_alevel from school_ks5_results (data-driven)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE schools s
            SET has_results_alevel = EXISTS (
              SELECT 1 FROM school_ks5_results k WHERE k.school_id = s.id
            )
            """
        )


def parse_time_period(tp: str | None) -> tuple[int | None, str | None]:
    s = (tp or "").strip().strip('"')
    if len(s) != 6 or not s.isdigit():
        return None, None
    y_start = int(s[:4])
    y_end_suf = int(s[4:6])
    y_end = 2000 + y_end_suf
    label = f"{y_start}/{str(y_end)[-2:]}"
    return y_end, label


def _int(s: str | None) -> int | None:
    if s is None or s in ("", "z", "x", "c"):
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def _num(s: str | None):
    if s is None or s in ("", "z", "x", "c"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _text(s: str | None) -> str | None:
    if s is None:
        return None
    v = (s or "").strip()
    if v in ("", "z", "x", "c"):
        return None
    return v


def is_alevel_total_school(row: dict[str, str]) -> bool:
    return (
        (row.get("geographic_level") or "").strip() == "School"
        and (row.get("disadvantage_status") or "").strip() == "Total"
        and (row.get("exam_cohort") or "").strip() == "A level"
    )


def map_performance_row(row: dict[str, str]) -> dict[str, Any] | None:
    tp = row.get("time_period")
    cohort_end_year, academic_year_label = parse_time_period(tp)
    if cohort_end_year is None or academic_year_label is None:
        return None

    def g(key: str) -> str | None:
        v = row.get(key)
        return (v or "").strip() or None

    return {
        "school_urn": g("school_urn"),
        "cohort_end_year": cohort_end_year,
        "academic_year_label": academic_year_label,
        "school_name": g("school_name"),
        "la_name": g("la_name"),
        "version": g("version"),
        "end1618_student_count": _int(g("end1618_student_count")),
        "aps_per_entry": _num(g("aps_per_entry")),
        "aps_per_entry_grade": _text(g("aps_per_entry_grade")),
        "aps_per_entry_student_count": _int(g("aps_per_entry_student_count")),
        "retained_percent": _num(g("retained_percent")),
        "retained_assessed_percent": _num(g("retained_assessed_percent")),
        "retained_student_count": _int(g("retained_student_count")),
        "value_added": g("value_added"),
        "value_added_upper_ci": g("value_added_upper_ci"),
        "value_added_lower_ci": g("value_added_lower_ci"),
        "progress_banding": _text(g("progress_banding")),
        "best_three_alevels_aps": _num(g("best_three_alevels_aps")),
        "best_three_alevels_grade": _text(g("best_three_alevels_grade")),
        "best_three_alevels_student_count": _int(g("best_three_alevels_student_count")),
        "aab_percent": _num(g("aab_percent")),
        "aab_student_count": _int(g("aab_student_count")),
    }


def init_alevel_grade_band_placeholders(rows: list[dict[str, Any]]) -> None:
    ph = {
        "alevel_exam_entries_denominator": None,
        "alevel_entries_pct_grade_astar": None,
        "alevel_entries_pct_grade_astar_a": None,
        "alevel_entries_pct_grade_astar_a_b": None,
    }
    for r in rows:
        r.update(ph)


def discover_subject_qual_result_csvs(zip_bytes: bytes) -> list[str]:
    """Paths inside the ZIP for institution_subject_and_qualification_results_*.csv."""
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        names = z.namelist()
    out = sorted(
        n
        for n in names
        if n.endswith(".csv")
        and "institution_subject_and_qualification_results_" in n.replace("\\", "/")
        and "value_added" not in n.replace("\\", "/")
    )
    return out


def aggregate_alevel_grade_bands_subject_qual_zip(
    zip_bytes: bytes, inner_paths: list[str], urns: set[str]
) -> dict[tuple[str, int], dict[str, Any]]:
    """
    Share of GCE A level exam entries at A*, A*/A, A*/A/B — institution_subject_and_qualification
    file(s): per-subject grade lines + Total exam entries.
    """
    merged: dict[tuple[str, int], dict[str, Any]] = {}
    for inner_path in inner_paths:
        part = aggregate_alevel_grade_bands_single_subject_qual(
            zip_bytes, inner_path, urns
        )
        merged.update(part)
    return merged


def aggregate_alevel_grade_bands_single_subject_qual(
    zip_bytes: bytes, inner_path: str, urns: set[str]
) -> dict[tuple[str, int], dict[str, Any]]:
    den: dict[tuple[str, int], int] = defaultdict(int)
    n_astar: dict[tuple[str, int], int] = defaultdict(int)
    n_a: dict[tuple[str, int], int] = defaultdict(int)
    n_b: dict[tuple[str, int], int] = defaultdict(int)

    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            if inner_path not in z.namelist():
                print(f"Subject/qual file missing in ZIP: {inner_path}", file=sys.stderr)
                return {}
            with z.open(inner_path) as raw:
                reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
                for row in reader:
                    if (row.get("geographic_level") or "").strip() != "School":
                        continue
                    if (row.get("exam_cohort") or "").strip() != "A level":
                        continue
                    if (row.get("qualification_detailed") or "").strip() != "GCE A level":
                        continue
                    urn = (row.get("school_urn") or "").strip()
                    if urn not in urns:
                        continue
                    cy, _ = parse_time_period(row.get("time_period"))
                    if cy is None:
                        continue
                    key = (urn, cy)
                    grade = (row.get("grade") or "").strip()
                    rawc = (row.get("entries_count") or "").strip()
                    if rawc in ("", "z", "x", "c", "v"):
                        continue
                    try:
                        n = int(float(rawc))
                    except ValueError:
                        continue
                    if grade == "Total exam entries":
                        den[key] += n
                    elif grade == "A*":
                        n_astar[key] += n
                    elif grade == "A":
                        n_a[key] += n
                    elif grade == "B":
                        n_b[key] += n
    except Exception as e:
        print(f"aggregate_alevel_grade_bands_single_subject_qual: {e}", file=sys.stderr)
        return {}

    out: dict[tuple[str, int], dict[str, Any]] = {}
    for key, d in den.items():
        if d <= 0:
            continue
        sa, a_ct, b_ct = n_astar[key], n_a[key], n_b[key]
        out[key] = {
            "alevel_exam_entries_denominator": d,
            "alevel_entries_pct_grade_astar": round(100.0 * sa / d, 2),
            "alevel_entries_pct_grade_astar_a": round(100.0 * (sa + a_ct) / d, 2),
            "alevel_entries_pct_grade_astar_a_b": round(100.0 * (sa + a_ct + b_ct) / d, 2),
        }
    return out


def aggregate_alevel_grade_bands_all_inst(
    zip_bytes: bytes, inner_path: str, urns: set[str]
) -> dict[tuple[str, int], dict[str, Any]]:
    """
    Entry-grade shares from all_inst_data.csv: “All subjects” rows only (DfE roll-up).
    A* may appear as grade_total_entries '*' (A level grade scale *,A,B,…).
    """
    tallies: dict[tuple[str, int], dict[str, int]] = defaultdict(
        lambda: {"astar": 0, "a": 0, "b": 0, "den": 0}
    )

    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            if inner_path not in z.namelist():
                print(f"all_inst_data missing in ZIP: {inner_path}", file=sys.stderr)
                return {}
            with z.open(inner_path) as raw:
                reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
                for row in reader:
                    if (row.get("geographic_level") or "").strip() != "School":
                        continue
                    if (row.get("exam_cohort") or "").strip() != "A level":
                        continue
                    if (row.get("qualification") or "").strip() != "GCE A level":
                        continue
                    if (row.get("subject") or "").strip() != "All subjects":
                        continue
                    urn = (row.get("school_urn") or "").strip()
                    if urn not in urns:
                        continue
                    cy, _ = parse_time_period(row.get("time_period"))
                    if cy is None:
                        continue
                    g = (row.get("grade_total_entries") or "").strip()
                    n = _int((row.get("number_of_exams") or "").strip() or None)
                    if n is None or n < 0:
                        continue
                    key = (urn, cy)
                    t = tallies[key]
                    if g in ("*", "A*"):
                        t["astar"] = n
                    elif g == "A":
                        t["a"] = n
                    elif g == "B":
                        t["b"] = n
                    elif g == "Total":
                        t["den"] = n
    except Exception as e:
        print(f"aggregate_alevel_grade_bands_all_inst: {e}", file=sys.stderr)
        return {}

    out: dict[tuple[str, int], dict[str, Any]] = {}
    for key, t in tallies.items():
        d = t["den"]
        if d <= 0:
            continue
        sa, a_ct, b_ct = t["astar"], t["a"], t["b"]
        out[key] = {
            "alevel_exam_entries_denominator": d,
            "alevel_entries_pct_grade_astar": round(100.0 * sa / d, 2),
            "alevel_entries_pct_grade_astar_a": round(100.0 * (sa + a_ct) / d, 2),
            "alevel_entries_pct_grade_astar_a_b": round(100.0 * (sa + a_ct + b_ct) / d, 2),
        }
    return out


def apply_alevel_grade_bands(
    rows: list[dict[str, Any]], bands: dict[tuple[str, int], dict[str, Any]]
) -> None:
    for r in rows:
        urn = (r.get("school_urn") or "").strip()
        cy = r.get("cohort_end_year")
        if not urn or cy is None:
            continue
        try:
            k = int(cy)
        except (TypeError, ValueError):
            continue
        m = bands.get((urn, k))
        if m:
            r.update(m)


def extract_performance_rows(zip_bytes: bytes, urns: set[str]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        if INSTITUTION_PERFORMANCE_CSV not in z.namelist():
            print(f"Missing {INSTITUTION_PERFORMANCE_CSV} in ZIP", file=sys.stderr)
            return out
        with z.open(INSTITUTION_PERFORMANCE_CSV) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
            for row in reader:
                if not is_alevel_total_school(row):
                    continue
                urn = (row.get("school_urn") or "").strip()
                if urn not in urns:
                    continue
                mapped = map_performance_row(row)
                if mapped and mapped.get("school_urn"):
                    cy = mapped.get("cohort_end_year")
                    if cy is not None and (
                        cy < MIN_COHORT_END_YEAR or cy > MAX_COHORT_END_YEAR
                    ):
                        continue
                    out.append(mapped)
    return out


def attach_data_source_urls(rows: list[dict[str, Any]]) -> None:
    for r in rows:
        cy = r.get("cohort_end_year")
        if cy is None:
            r["data_source_url"] = None
            continue
        try:
            key = int(cy)
        except (TypeError, ValueError):
            r["data_source_url"] = None
            continue
        r["data_source_url"] = DATA_SOURCE_URL_BY_COHORT_END_YEAR.get(key)


def fetch_urn_to_school_id(conn) -> dict[str, int]:
    import psycopg2

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, school_code FROM schools
            WHERE school_code IS NOT NULL AND TRIM(school_code) <> ''
            """
        )
        return {str(row[1]).strip(): row[0] for row in cur.fetchall()}


def attach_school_ids(rows: list[dict[str, Any]], urn_to_id: dict[str, int]) -> None:
    for r in rows:
        urn = (r.get("school_urn") or "").strip()
        r["school_id"] = urn_to_id.get(urn) if urn else None


def upsert_rows(conn, rows: list[dict[str, Any]]) -> None:
    import psycopg2.extras

    sql = """
    INSERT INTO school_ks5_results (
      school_urn, school_id, cohort_end_year, academic_year_label, school_name, la_name, version,
      end1618_student_count, aps_per_entry, aps_per_entry_grade, aps_per_entry_student_count,
      retained_percent, retained_assessed_percent, retained_student_count,
      value_added, value_added_upper_ci, value_added_lower_ci, progress_banding,
      best_three_alevels_aps, best_three_alevels_grade, best_three_alevels_student_count,
      aab_percent, aab_student_count,
      alevel_exam_entries_denominator, alevel_entries_pct_grade_astar,
      alevel_entries_pct_grade_astar_a, alevel_entries_pct_grade_astar_a_b,
      data_source_url
    ) VALUES (
      %(school_urn)s, %(school_id)s, %(cohort_end_year)s, %(academic_year_label)s, %(school_name)s, %(la_name)s, %(version)s,
      %(end1618_student_count)s, %(aps_per_entry)s, %(aps_per_entry_grade)s, %(aps_per_entry_student_count)s,
      %(retained_percent)s, %(retained_assessed_percent)s, %(retained_student_count)s,
      %(value_added)s, %(value_added_upper_ci)s, %(value_added_lower_ci)s, %(progress_banding)s,
      %(best_three_alevels_aps)s, %(best_three_alevels_grade)s, %(best_three_alevels_student_count)s,
      %(aab_percent)s, %(aab_student_count)s,
      %(alevel_exam_entries_denominator)s, %(alevel_entries_pct_grade_astar)s,
      %(alevel_entries_pct_grade_astar_a)s, %(alevel_entries_pct_grade_astar_a_b)s,
      %(data_source_url)s
    )
    ON CONFLICT (school_urn, cohort_end_year) DO UPDATE SET
      school_id = EXCLUDED.school_id,
      academic_year_label = EXCLUDED.academic_year_label,
      school_name = EXCLUDED.school_name,
      la_name = EXCLUDED.la_name,
      version = EXCLUDED.version,
      end1618_student_count = EXCLUDED.end1618_student_count,
      aps_per_entry = EXCLUDED.aps_per_entry,
      aps_per_entry_grade = EXCLUDED.aps_per_entry_grade,
      aps_per_entry_student_count = EXCLUDED.aps_per_entry_student_count,
      retained_percent = EXCLUDED.retained_percent,
      retained_assessed_percent = EXCLUDED.retained_assessed_percent,
      retained_student_count = EXCLUDED.retained_student_count,
      value_added = EXCLUDED.value_added,
      value_added_upper_ci = EXCLUDED.value_added_upper_ci,
      value_added_lower_ci = EXCLUDED.value_added_lower_ci,
      progress_banding = EXCLUDED.progress_banding,
      best_three_alevels_aps = EXCLUDED.best_three_alevels_aps,
      best_three_alevels_grade = EXCLUDED.best_three_alevels_grade,
      best_three_alevels_student_count = EXCLUDED.best_three_alevels_student_count,
      aab_percent = EXCLUDED.aab_percent,
      aab_student_count = EXCLUDED.aab_student_count,
      alevel_exam_entries_denominator = EXCLUDED.alevel_exam_entries_denominator,
      alevel_entries_pct_grade_astar = EXCLUDED.alevel_entries_pct_grade_astar,
      alevel_entries_pct_grade_astar_a = EXCLUDED.alevel_entries_pct_grade_astar_a,
      alevel_entries_pct_grade_astar_a_b = EXCLUDED.alevel_entries_pct_grade_astar_a_b,
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

        print("Downloading KS5 / 16–18 latest release ZIP…")
        z_ks5_latest = download_zip(KS5_RELEASE_ZIP_LATEST)
        rows = extract_performance_rows(z_ks5_latest, urns)
        print(
            f"Performance rows (A level / Total / School, cohort {MIN_COHORT_END_YEAR}–{MAX_COHORT_END_YEAR}): {len(rows)}"
        )
        init_alevel_grade_band_placeholders(rows)
        bands: dict[tuple[str, int], dict[str, Any]] = {}

        subj_csvs = discover_subject_qual_result_csvs(z_ks5_latest)
        if subj_csvs:
            print(
                "Aggregating A level entry grade bands from subject/qualification CSV(s) "
                f"in latest ZIP ({len(subj_csvs)} file(s))…"
            )
            bands.update(
                aggregate_alevel_grade_bands_subject_qual_zip(z_ks5_latest, subj_csvs, urns)
            )
        else:
            print(
                "No institution_subject_and_qualification_results_*.csv in latest ZIP",
                file=sys.stderr,
            )

        print("Downloading KS5 / 16–18 2023-24 publication ZIP (all_inst grade roll-up for cohort 2024)…")
        z_ks5_prev = download_zip(KS5_RELEASE_ZIP_2023_24_PUBLICATION)
        n_before = len(bands)
        bands.update(
            aggregate_alevel_grade_bands_all_inst(z_ks5_prev, ALL_INST_DATA_CSV, urns)
        )
        print(f"  Added {len(bands) - n_before} keys from all_inst_data.csv")

        apply_alevel_grade_bands(rows, bands)
        print(f"  Grade-band metrics attached for {len(bands)} school–cohort keys total")
        attach_data_source_urls(rows)

        urn_to_id = fetch_urn_to_school_id(conn)
        attach_school_ids(rows, urn_to_id)
        upsert_rows(conn, rows)
        refresh_ks5_drawer_flags(conn)
        conn.commit()

        print(f"Upserted {len(rows)} school–cohort rows into school_ks5_results. Refreshed has_results_alevel flags.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
