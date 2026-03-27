#!/usr/bin/env python3
"""
Load DfE KS4 headline rows into school_gcse_results for every school in the
database that has a DfE URN (schools.school_code), when that URN appears in the
official open-data CSVs (state secondaries in England and other institutions
DfE publishes in the same tables — e.g. partially selective schools such as
Dame Alice Owen’s).

Uses cohort_end_year as the July calendar year ending the academic cycle:
  2025 -> 2024/25 (file 202425_*_performance_tables_schools_revised.csv)
  2024 -> 2023/24 (file 202324_*_performance_tables_schools_final.csv)

Also reads subject-level exam entries & grades (same ZIPs) to compute % of GCSE (9–1)
Full Course exam entries at grades 9 only, 8–9, 7–9, and 6–9—closest official analogue
to league-table “% high grades” (entries-based, not pupils).

2022/23 school-level headline CSV is not included in the standard Explore Education
Statistics “download all” bundle; pass --extra-csv-cohort3 path if you obtain one.

Requires: psycopg2-binary (pip install psycopg2-binary)
  DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE

Usage:
  pip install psycopg2-binary requests
  python3 server/scripts/load_school_gcse_dfe.py \\
    --database-url postgresql://postgres:postgres@localhost:5432/schoolmap
"""
from __future__ import annotations

import argparse
import csv
import io
import os
import re
import sys
import zipfile
from collections import defaultdict
from typing import Any, Callable

# GCSE (9–1) qualifications counted for “high grade % of entries” (DfE subject file).
GCSE_91_FULL_COURSE = frozenset(
    {
        "GCSE (9-1) Full Course",
        "GCSE (9-1) Full Course (Double Award)",
    }
)

# For approximate "7+ in both English & maths" from subject file (headline school CSV has only 5+ and 4+ combined).
ENGMATH_7_SUBJECTS = frozenset({"Mathematics", "English Language"})
ENGMATH_7_GRADES = frozenset({"7", "8", "9"})

# Subject CSV paths inside each release ZIP (Explore Education Statistics “all files”).
SUBJECT_SCHOOL_EXAM_ENTRIES_GRADES = {
    2025: "data/202425_subject_school_all_exam_entriesgrades_revised.csv",
    2024: "data/202324_subject_school_all_exam_entriesgrades_final.csv",
}

ENTRY_METRIC_KEYS = (
    "gcse_exam_entries_denominator",
    "gcse_entries_pct_grade_9",
    "gcse_entries_pct_grade_8_9",
    "gcse_entries_pct_grade_7_9",
    "gcse_entries_pct_grade_6_9",
)

# Explore Education Statistics — accredited official statistics (GOV.UK), one page per release / academic year.
DATA_SOURCE_URL_BY_COHORT_END_YEAR: dict[int, str] = {
    2025: "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance/2024-25",
    2024: "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance/2023-24",
    2023: "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance/2022-23",
}

import requests

# Release ZIPs (Explore Education Statistics → download all data)
RELEASES = {
    2025: (
        "https://content.explore-education-statistics.service.gov.uk/api/releases/"
        "4e06e0e2-d705-462c-bb99-97afa166928c/files",
        "data/202425_performance_tables_schools_revised.csv",
        "2024/25",
    ),
    2024: (
        "https://content.explore-education-statistics.service.gov.uk/api/releases/"
        "b76a938a-7875-4542-af20-0b23ecb99a49/files",
        "data/202324_performance_tables_schools_final.csv",
        "2023/24",
    ),
}

def download_zip(url: str) -> bytes:
    r = requests.get(url, timeout=300)
    r.raise_for_status()
    return r.content


def fetch_school_urns_from_db(conn) -> set[str]:
    """URNs for all app schools with a DfE school_code (intersected with CSV rows in extract)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT TRIM(school_code) FROM schools
            WHERE school_code IS NOT NULL AND TRIM(school_code) <> ''
            """
        )
        return {str(row[0]).strip() for row in cur.fetchall() if row[0]}


def refresh_gcse_drawer_flags(conn) -> None:
    """Set schools.has_results_gcse from school_gcse_results (data-driven)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE schools s
            SET has_results_gcse = EXISTS (
              SELECT 1 FROM school_gcse_results g WHERE g.school_id = s.id
            )
            """
        )


def is_headline_2425(row: dict[str, str]) -> bool:
    return (
        row.get("breakdown_topic") == "Total"
        and row.get("breakdown") == "Total"
        and row.get("sex") == "Total"
        and row.get("disadvantage_status") == "Total"
        and row.get("first_language") == "Total"
        and row.get("prior_attainment") == "Total"
        and row.get("mobility") == "Total"
    )


def is_headline_2324(row: dict[str, str]) -> bool:
    return (
        row.get("breakdown_topic") == "Total"
        and row.get("breakdown") == "Total"
        and row.get("sex") == "Total"
        and (row.get("disadvantage") or row.get("disadvantage_status")) == "Total"
        and row.get("first_language") == "Total"
        and row.get("prior_attainment") == "Total"
        and row.get("mobility") == "Total"
    )


def map_row_2425(row: dict[str, str], cohort_end_year: int, label: str) -> dict[str, Any]:
    def g(key: str) -> str | None:
        v = row.get(key)
        return (v or "").strip() or None

    return {
        "school_urn": g("school_urn"),
        "cohort_end_year": cohort_end_year,
        "academic_year_label": label,
        "school_name": g("school_name"),
        "la_name": g("la_name"),
        "version": g("version"),
        "pupil_count": _int(g("pupil_count")),
        "attainment8_average": _num(g("attainment8_average")),
        "progress8_average": g("progress8_average"),
        "progress8_lower_95_ci": g("progress8_lower_95_ci"),
        "progress8_upper_95_ci": g("progress8_upper_95_ci"),
        "engmath_95_percent": _num(g("engmath_95_percent")),
        "engmath_94_percent": _num(g("engmath_94_percent")),
        "gcse_91_percent": _num(g("gcse_91_percent")),
        "ebacc_entering_percent": _num(g("ebacc_entering_percent")),
        "ebacc_aps_average": _num(g("ebacc_aps_average")),
        "gcse_five_engmath_percent": _num(g("gcse_five_engmath_percent")),
        # Combined 7+ in both: not in headline table today; optional field if DfE adds it.
        "engmath_7_plus_percent": _num(g("engmath_73_percent")),
    }


def map_row_2324(row: dict[str, str], cohort_end_year: int, label: str) -> dict[str, Any]:
    def g(key: str) -> str | None:
        v = row.get(key)
        return (v or "").strip() or None

    p8 = g("avg_p8score")
    if p8 and re.match(r"^[\d.-]+$", p8 or ""):
        pass
    else:
        p8 = p8 if p8 else None

    return {
        "school_urn": g("school_urn"),
        "cohort_end_year": cohort_end_year,
        "academic_year_label": label,
        "school_name": g("school_name"),
        "la_name": g("la_name"),
        "version": g("version"),
        "pupil_count": _int(g("t_pupils")),
        "attainment8_average": _num(g("avg_att8")),
        "progress8_average": g("avg_p8score"),
        "progress8_lower_95_ci": g("p8score_ci_low"),
        "progress8_upper_95_ci": g("p8score_ci_upp"),
        "engmath_95_percent": _num(g("pt_l2basics_95")),
        "engmath_94_percent": _num(g("pt_l2basics_94")),
        # No direct analogue to 2024/25 gcse_91_percent in this layout; omit.
        "gcse_91_percent": None,
        "ebacc_entering_percent": _num(g("pt_ebacc_e_ptq_ee")),
        "ebacc_aps_average": _num(g("avg_ebaccaps")),
        "gcse_five_engmath_percent": _num(g("pt_5em_94")),
        "engmath_7_plus_percent": None,
    }


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


def extract_rows(
    zip_bytes: bytes,
    inner_path: str,
    urns: set[str],
    headline: Callable[[dict[str, str]], bool],
    mapper: Callable[[dict[str, str], int, str], dict[str, Any]],
    cohort_end_year: int,
    label: str,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        with z.open(inner_path) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
            for row in reader:
                urn = (row.get("school_urn") or "").strip()
                if urn not in urns or not headline(row):
                    continue
                out.append(mapper(row, cohort_end_year, label))
    return out


def aggregate_entry_grade_bands(
    zip_bytes: bytes, inner_path: str, urns: set[str]
) -> dict[str, dict[str, Any]]:
    """
    For each school URN, share of GCSE (9–1) Full Course exam entries at high grades.
    Denominator = sum of number_achieving where grade == 'Total exam entries' for those qualifications.
    """
    stats: dict[str, dict[str, int]] = defaultdict(
        lambda: {"den": 0, "n6": 0, "n7": 0, "n8": 0, "n9": 0}
    )
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            if inner_path not in z.namelist():
                print(f"Subject file missing in ZIP: {inner_path}", file=sys.stderr)
                return {}
            with z.open(inner_path) as raw:
                reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
                for row in reader:
                    urn = (row.get("school_urn") or "").strip()
                    if urn not in urns:
                        continue
                    qd = (row.get("qualification_detailed") or "").strip()
                    if qd not in GCSE_91_FULL_COURSE:
                        continue
                    grade = (row.get("grade") or "").strip()
                    nraw = (row.get("number_achieving") or "").strip()
                    if nraw in ("", "z", "x", "c"):
                        continue
                    try:
                        n = int(float(nraw))
                    except ValueError:
                        continue
                    st = stats[urn]
                    if grade == "Total exam entries":
                        st["den"] += n
                    elif grade == "6":
                        st["n6"] += n
                    elif grade == "7":
                        st["n7"] += n
                    elif grade == "8":
                        st["n8"] += n
                    elif grade == "9":
                        st["n9"] += n
    except Exception as e:
        print(f"aggregate_entry_grade_bands: {e}", file=sys.stderr)
        return {}

    out: dict[str, dict[str, Any]] = {}
    for urn, st in stats.items():
        den = st["den"]
        if den <= 0:
            out[urn] = {k: None for k in ENTRY_METRIC_KEYS}
            continue
        n6, n7, n8, n9 = st["n6"], st["n7"], st["n8"], st["n9"]
        out[urn] = {
            "gcse_exam_entries_denominator": den,
            "gcse_entries_pct_grade_9": round(100.0 * n9 / den, 2),
            "gcse_entries_pct_grade_8_9": round(100.0 * (n8 + n9) / den, 2),
            "gcse_entries_pct_grade_7_9": round(100.0 * (n7 + n8 + n9) / den, 2),
            "gcse_entries_pct_grade_6_9": round(100.0 * (n6 + n7 + n8 + n9) / den, 2),
        }
    return out


def apply_entry_metrics_for_cohort(
    rows: list[dict[str, Any]],
    metrics_by_urn: dict[str, dict[str, Any]],
    cohort_end_year: int,
) -> None:
    for r in rows:
        if r.get("cohort_end_year") != cohort_end_year:
            continue
        urn = (r.get("school_urn") or "").strip()
        m = metrics_by_urn.get(urn)
        if not m:
            continue
        for k in ENTRY_METRIC_KEYS:
            r[k] = m.get(k)


def init_entry_metric_placeholders(rows: list[dict[str, Any]]) -> None:
    for r in rows:
        for k in ENTRY_METRIC_KEYS:
            r[k] = None


def aggregate_engmath_seven_plus_joint_from_subjects(
    zip_bytes: bytes, inner_path: str, urns: set[str]
) -> dict[str, float]:
    """
    Approximate % of pupils with grade 7+ in both English Language and Mathematics.
    Uses share of exam entries at grades 7–9 in each subject, then p_both ≈ p_m * p_e
    (independence assumption). Official headline school CSV does not publish combined 7+.
    """
    stats: dict[str, dict[str, int]] = defaultdict(
        lambda: {"mt": 0, "mh": 0, "et": 0, "eh": 0}
    )
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            if inner_path not in z.namelist():
                return {}
            with z.open(inner_path) as raw:
                reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
                for row in reader:
                    urn = (row.get("school_urn") or "").strip()
                    if urn not in urns:
                        continue
                    qd = (row.get("qualification_detailed") or "").strip()
                    if qd not in GCSE_91_FULL_COURSE:
                        continue
                    subj = (row.get("subject") or "").strip()
                    if subj not in ENGMATH_7_SUBJECTS:
                        continue
                    grade = (row.get("grade") or "").strip()
                    nraw = (row.get("number_achieving") or "").strip()
                    if nraw in ("", "z", "x", "c"):
                        continue
                    try:
                        n = int(float(nraw))
                    except ValueError:
                        continue
                    st = stats[urn]
                    if grade == "Total exam entries":
                        if subj == "Mathematics":
                            st["mt"] += n
                        else:
                            st["et"] += n
                    elif grade in ENGMATH_7_GRADES:
                        if subj == "Mathematics":
                            st["mh"] += n
                        else:
                            st["eh"] += n
    except Exception as e:
        print(f"aggregate_engmath_seven_plus_joint_from_subjects: {e}", file=sys.stderr)
        return {}

    out: dict[str, float] = {}
    for urn, st in stats.items():
        mt, et = st["mt"], st["et"]
        if mt <= 0 or et <= 0:
            continue
        pm = 100.0 * st["mh"] / mt
        pe = 100.0 * st["eh"] / et
        out[urn] = round(pm * pe / 100.0, 2)
    return out


def apply_engmath_seven_plus_estimate_for_cohort(
    rows: list[dict[str, Any]],
    estimate_by_urn: dict[str, float],
    cohort_end_year: int,
) -> None:
    """Fill estimate only when headline did not supply engmath_7_plus_percent."""
    for r in rows:
        if r.get("cohort_end_year") != cohort_end_year:
            continue
        if r.get("engmath_7_plus_percent") is not None:
            continue
        urn = (r.get("school_urn") or "").strip()
        est = estimate_by_urn.get(urn)
        if est is not None:
            r["engmath_7_plus_percent"] = est


def fetch_urn_to_school_id(conn) -> dict[str, int]:
    """Map schools.school_code (DfE URN) -> schools.id for rows we track in the app."""
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


def upsert_rows(conn, rows: list[dict[str, Any]]) -> None:
    import psycopg2.extras

    sql = """
    INSERT INTO school_gcse_results (
      school_urn, school_id, cohort_end_year, academic_year_label, school_name, la_name, version,
      pupil_count, attainment8_average, progress8_average, progress8_lower_95_ci, progress8_upper_95_ci,
      engmath_95_percent, engmath_94_percent, gcse_91_percent, ebacc_entering_percent, ebacc_aps_average,
      gcse_five_engmath_percent,
      gcse_exam_entries_denominator, gcse_entries_pct_grade_9, gcse_entries_pct_grade_8_9,
      gcse_entries_pct_grade_7_9, gcse_entries_pct_grade_6_9,
      data_source_url,
      engmath_7_plus_percent
    ) VALUES (
      %(school_urn)s, %(school_id)s, %(cohort_end_year)s, %(academic_year_label)s, %(school_name)s, %(la_name)s, %(version)s,
      %(pupil_count)s, %(attainment8_average)s, %(progress8_average)s, %(progress8_lower_95_ci)s, %(progress8_upper_95_ci)s,
      %(engmath_95_percent)s, %(engmath_94_percent)s, %(gcse_91_percent)s, %(ebacc_entering_percent)s, %(ebacc_aps_average)s,
      %(gcse_five_engmath_percent)s,
      %(gcse_exam_entries_denominator)s, %(gcse_entries_pct_grade_9)s, %(gcse_entries_pct_grade_8_9)s,
      %(gcse_entries_pct_grade_7_9)s, %(gcse_entries_pct_grade_6_9)s,
      %(data_source_url)s,
      %(engmath_7_plus_percent)s
    )
    ON CONFLICT (school_urn, cohort_end_year) DO UPDATE SET
      school_id = EXCLUDED.school_id,
      academic_year_label = EXCLUDED.academic_year_label,
      school_name = EXCLUDED.school_name,
      la_name = EXCLUDED.la_name,
      version = EXCLUDED.version,
      pupil_count = EXCLUDED.pupil_count,
      attainment8_average = EXCLUDED.attainment8_average,
      progress8_average = EXCLUDED.progress8_average,
      progress8_lower_95_ci = EXCLUDED.progress8_lower_95_ci,
      progress8_upper_95_ci = EXCLUDED.progress8_upper_95_ci,
      engmath_95_percent = EXCLUDED.engmath_95_percent,
      engmath_94_percent = EXCLUDED.engmath_94_percent,
      gcse_91_percent = EXCLUDED.gcse_91_percent,
      ebacc_entering_percent = EXCLUDED.ebacc_entering_percent,
      ebacc_aps_average = EXCLUDED.ebacc_aps_average,
      gcse_five_engmath_percent = EXCLUDED.gcse_five_engmath_percent,
      gcse_exam_entries_denominator = EXCLUDED.gcse_exam_entries_denominator,
      gcse_entries_pct_grade_9 = EXCLUDED.gcse_entries_pct_grade_9,
      gcse_entries_pct_grade_8_9 = EXCLUDED.gcse_entries_pct_grade_8_9,
      gcse_entries_pct_grade_7_9 = EXCLUDED.gcse_entries_pct_grade_7_9,
      gcse_entries_pct_grade_6_9 = EXCLUDED.gcse_entries_pct_grade_6_9,
      data_source_url = EXCLUDED.data_source_url,
      engmath_7_plus_percent = EXCLUDED.engmath_7_plus_percent,
      created_at = NOW();
    """

    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    ap.add_argument(
        "--extra-csv-cohort3",
        type=str,
        default=None,
        help="Optional CSV with same columns as 2024/25 headline export for cohort ending 2023 (2022/23).",
    )
    args = ap.parse_args()

    db_url = args.database_url
    if not db_url:
        print("Set --database-url or DATABASE_URL", file=sys.stderr)
        sys.exit(1)

    try:
        import psycopg2
    except ImportError:
        print("pip install psycopg2-binary requests", file=sys.stderr)
        sys.exit(1)

    conn = psycopg2.connect(db_url)
    try:
        urns = fetch_school_urns_from_db(conn)
        print(f"School URNs from database: {len(urns)}")
        if not urns:
            print("No schools with school_code — nothing to load.", file=sys.stderr)
            sys.exit(1)

        all_rows: list[dict[str, Any]] = []

        z25 = download_zip(RELEASES[2025][0])
        all_rows.extend(
            extract_rows(
                z25,
                RELEASES[2025][1],
                urns,
                is_headline_2425,
                map_row_2425,
                2025,
                RELEASES[2025][2],
            )
        )
        print(f"2024/25 rows: {len([r for r in all_rows if r['cohort_end_year'] == 2025])}")

        z24 = download_zip(RELEASES[2024][0])
        y24 = extract_rows(
            z24,
            RELEASES[2024][1],
            urns,
            is_headline_2324,
            map_row_2324,
            2024,
            RELEASES[2024][2],
        )
        all_rows.extend(y24)
        print(f"2023/24 rows: {len(y24)}")

        init_entry_metric_placeholders(all_rows)
        print("Aggregating GCSE entry grade bands from subject CSVs…")
        bands_25 = aggregate_entry_grade_bands(z25, SUBJECT_SCHOOL_EXAM_ENTRIES_GRADES[2025], urns)
        apply_entry_metrics_for_cohort(all_rows, bands_25, 2025)
        print(f"  2024/25 cohort: entry-band metrics for {len(bands_25)} URNs")
        bands_24 = aggregate_entry_grade_bands(z24, SUBJECT_SCHOOL_EXAM_ENTRIES_GRADES[2024], urns)
        apply_entry_metrics_for_cohort(all_rows, bands_24, 2024)
        print(f"  2023/24 cohort: entry-band metrics for {len(bands_24)} URNs")

        em7_25 = aggregate_engmath_seven_plus_joint_from_subjects(
            z25, SUBJECT_SCHOOL_EXAM_ENTRIES_GRADES[2025], urns
        )
        apply_engmath_seven_plus_estimate_for_cohort(all_rows, em7_25, 2025)
        em7_24 = aggregate_engmath_seven_plus_joint_from_subjects(
            z24, SUBJECT_SCHOOL_EXAM_ENTRIES_GRADES[2024], urns
        )
        apply_engmath_seven_plus_estimate_for_cohort(all_rows, em7_24, 2024)

        if args.extra_csv_cohort3:
            with open(args.extra_csv_cohort3, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    urn = (row.get("school_urn") or "").strip()
                    if urn not in urns or not is_headline_2425(row):
                        continue
                    all_rows.append(map_row_2425(row, 2023, "2022/23"))

        attach_data_source_urls(all_rows)

        urn_to_id = fetch_urn_to_school_id(conn)
        attach_school_ids(all_rows, urn_to_id)
        upsert_rows(conn, all_rows)
        refresh_gcse_drawer_flags(conn)
        conn.commit()

        print(f"Upserted total {len(all_rows)} school-year rows. Refreshed has_results_gcse flags.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
