from __future__ import annotations

import json
import re

import requests

from . import common

SUTTON_ALLOCATION_PAGE = "https://www.sutton.gov.uk/w/secondary-school-allocation-information"
SUTTON_ADMISSIONS_HUB = "https://www.sutton.gov.uk/school-admissions"


def parse_sutton_allocation_table(html: str) -> list[tuple[str, str, str, str]]:
    """Returns (school_name, dfe_number_cell, pan, furthest_m)."""
    rows: list[tuple[str, str, str, str]] = []
    for block in re.findall(r'<tr class="govuk-table__row">(.*?)</tr>', html, re.DOTALL | re.IGNORECASE):
        if 'scope="row"' not in block:
            continue
        name_m = re.search(r'scope="row"[^>]*>([^<]+)<', block)
        if not name_m:
            continue
        name = name_m.group(1).strip()
        cells = re.findall(r'<td class="govuk-table__cell">([^<]*)</td>', block)
        if len(cells) < 3:
            continue
        rows.append((name, cells[0].strip(), cells[1].strip(), cells[2].strip()))
    return rows


def sutton_line_items(pan: str, furthest_m: str, selective_note: bool) -> list[str]:
    items = [
        f"Published Admission Number (PAN): {pan}",
        f"Furthest distance offered (metres from school gate, where published): {furthest_m}",
    ]
    if selective_note or (furthest_m.upper() in ("N/A", "")):
        items.append(
            "Selective schools: admission is based on the borough’s selective test; "
            "“furthest distance” is often shown as N/A on the council table. "
            "Contact the school or Sutton admissions for how places were allocated in a given year."
        )
    return items


def run(cur, *, entry_year: int, dry_run: bool = False) -> tuple[int, list[str]]:
    r = requests.get(SUTTON_ALLOCATION_PAGE, timeout=60)
    r.raise_for_status()
    parsed = parse_sutton_allocation_table(r.text)

    if dry_run:
        print(f"[sutton] Parsed {len(parsed)} table rows; sample: {parsed[:3]}")
        return len(parsed), []

    cur.execute("DELETE FROM admissions_allocation_history WHERE la_slug = %s", ("sutton",))
    by_key = common.load_school_maps(cur)

    n = 0
    misses: list[str] = []
    profile_heading = "Place allocation information for Sutton secondary schools (national offer day table)"

    for school_name, _dfe, pan, furthest in parsed:
        resolved = common.resolve_school(school_name, by_key)
        if not resolved:
            misses.append(school_name)
            continue
        sid, db_name, urn = resolved
        # Mark our in-app selective schools (grammar) for explanatory text
        selective = db_name in (
            "Nonsuch High School for Girls",
            "Wallington High School for Girls",
            "Wilson's School",
            "Sutton Grammar School",
        )
        lines = sutton_line_items(pan, furthest, selective)
        cur.execute(
            common.INSERT_SQL,
            (
                sid,
                entry_year,
                urn,
                "sutton",
                1,
                "march_national",
                "National offer day (Sutton Council table)",
                profile_heading,
                json.dumps(lines),
                SUTTON_ALLOCATION_PAGE,
                SUTTON_ADMISSIONS_HUB,
            ),
        )
        n += 1

    common.ensure_refresh_log(
        cur,
        "sutton_secondary_allocation_table",
        "Sutton Council — secondary allocation information table → admissions_allocation_history",
        [
            {"label": "Secondary school allocation information", "url": SUTTON_ALLOCATION_PAGE},
            {"label": "School admissions hub", "url": SUTTON_ADMISSIONS_HUB},
        ],
        "server/scripts/load_admission_allocations.py (Sutton)",
        "Single snapshot row per school from the live council HTML table; re-run after national offer day when the page is updated. Pass --sutton-entry-year to match September entry year.",
    )
    common.touch_refresh_log(cur, "sutton_secondary_allocation_table")
    return n, misses
