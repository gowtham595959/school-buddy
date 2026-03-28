#!/usr/bin/env python3
"""
Build KS4 + 16–18 extracts for the 163 state-funded selective schools (DfE
admission policy "selective schools") from official Explore Education Statistics
ZIPs downloaded into data/dfe-performance/.

Outputs (default): data/grammar-schools-dfe/
  - grammar_163_schools.csv          — URN, name, LA, phase (source list)
  - grammar_163_ks4_headlines.csv    — one headline row per school
  - grammar_163_ks5_institution.csv  — all institution_performance rows for those URNs
  - grammar_163_dfe.xlsx             — same data as three sheets

Requires: Python 3.9+, openpyxl (pip install openpyxl)

Usage:
  python3 server/scripts/export_grammar_163_dfe.py
  python3 server/scripts/export_grammar_163_dfe.py --ks4-zip path --ks5-zip path --out-dir path
"""

from __future__ import annotations

import argparse
import csv
import io
import zipfile
from pathlib import Path


def load_selective_urns(z: zipfile.ZipFile) -> dict[str, dict[str, str]]:
    """URN -> metadata from information_about_schools (selective, non-independent)."""
    name = "data/202425_information_about_schools_provisional.csv"
    out: dict[str, dict[str, str]] = {}
    with z.open(name) as raw:
        r = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
        for row in r:
            if row.get("admpol_pt") != "selective schools":
                continue
            et = row.get("establishment_type_group") or ""
            if "Independent" in et:
                continue
            urn = (row.get("school_urn") or "").strip()
            if not urn:
                continue
            out[urn] = {
                "school_urn": urn,
                "school_name": row.get("school_name") or "",
                "la_name": row.get("la_name") or "",
                "establishment_type_group": et,
                "school_laestab": row.get("school_laestab") or "",
            }
    return out


def is_ks4_headline(row: dict[str, str]) -> bool:
    return (
        row.get("breakdown_topic") == "Total"
        and row.get("breakdown") == "Total"
        and row.get("sex") == "Total"
        and row.get("disadvantage_status") == "Total"
        and row.get("first_language") == "Total"
        and row.get("prior_attainment") == "Total"
        and row.get("mobility") == "Total"
    )


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def rows_to_xlsx(path: Path, sheets: list[tuple[str, list[str], list[dict[str, str]]]]) -> None:
    import openpyxl

    path.parent.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.Workbook()
    first = True
    for title, fields, rows in sheets:
        if first:
            ws = wb.active
            ws.title = title[:31]
            first = False
        else:
            ws = wb.create_sheet(title=title[:31])
        ws.append(fields)
        for row in rows:
            ws.append([row.get(h, "") for h in fields])
    wb.save(path)


def main() -> None:
    root = Path(__file__).resolve().parent.parent.parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--ks4-zip", type=Path, default=root / "data/dfe-performance/ks4-2024-25_all_files.zip")
    ap.add_argument("--ks5-zip", type=Path, default=root / "data/dfe-performance/a-level-16-18-2024-25_all_files.zip")
    ap.add_argument("--out-dir", type=Path, default=root / "data/grammar-schools-dfe")
    args = ap.parse_args()

    if not args.ks4_zip.is_file():
        raise SystemExit(f"Missing KS4 ZIP: {args.ks4_zip}\nRun: ./server/scripts/download_dfe_performance.sh")
    if not args.ks5_zip.is_file():
        raise SystemExit(f"Missing 16–18 ZIP: {args.ks5_zip}")

    with zipfile.ZipFile(args.ks4_zip) as z4:
        schools_meta = load_selective_urns(z4)
        urns = set(schools_meta.keys())

        if len(urns) != 163:
            print(f"Warning: expected 163 selective non-independent schools; got {len(urns)}")

        school_rows = [schools_meta[u] for u in sorted(urns, key=int)]
        school_fields = [
            "school_urn",
            "school_name",
            "la_name",
            "establishment_type_group",
            "school_laestab",
        ]

        ks4_rows: list[dict[str, str]] = []
        ks4_fields: list[str] = []
        with z4.open("data/202425_performance_tables_schools_revised.csv") as raw:
            r = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
            ks4_fields = list(r.fieldnames or [])
            for row in r:
                urn = (row.get("school_urn") or "").strip()
                if urn not in urns or not is_ks4_headline(row):
                    continue
                ks4_rows.append(row)

        ks4_rows.sort(key=lambda x: int(x["school_urn"]))
        missing_ks4 = urns - {r["school_urn"] for r in ks4_rows}
        if missing_ks4:
            print(f"Warning: {len(missing_ks4)} URNs missing from KS4 headline table (suppression / not in file)")

    ks5_rows: list[dict[str, str]] = []
    ks5_fields: list[str] = []
    with zipfile.ZipFile(args.ks5_zip) as z5:
        with z5.open("data/institution_performance_202225.csv") as raw:
            r = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"))
            ks5_fields = list(r.fieldnames or [])
            for row in r:
                urn = (row.get("school_urn") or "").strip()
                if urn in urns:
                    ks5_rows.append(row)

    ks5_rows.sort(key=lambda x: (int(x["school_urn"]), x.get("disadvantage_status", ""), x.get("exam_cohort", "")))
    missing_ks5 = urns - {r["school_urn"] for r in ks5_rows}
    if missing_ks5:
        print(f"Warning: {len(missing_ks5)} URNs have no rows in institution_performance file")

    out = args.out_dir
    write_csv(out / "grammar_163_schools.csv", school_fields, school_rows)
    write_csv(out / "grammar_163_ks4_headlines.csv", ks4_fields, ks4_rows)
    write_csv(out / "grammar_163_ks5_institution.csv", ks5_fields, ks5_rows)

    rows_to_xlsx(
        out / "grammar_163_dfe.xlsx",
        [
            ("Schools", school_fields, school_rows),
            ("KS4_headlines", ks4_fields, ks4_rows),
            ("KS5_institution", ks5_fields, ks5_rows),
        ],
    )

    print(f"Wrote {out}/")
    print(f"  grammar_163_schools.csv           ({len(school_rows)} rows)")
    print(f"  grammar_163_ks4_headlines.csv     ({len(ks4_rows)} rows)")
    print(f"  grammar_163_ks5_institution.csv   ({len(ks5_rows)} rows)")
    print(f"  grammar_163_dfe.xlsx")


if __name__ == "__main__":
    main()
