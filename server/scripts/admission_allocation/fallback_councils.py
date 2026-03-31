from __future__ import annotations

import json

from . import common

# Councils where we do not yet parse a dedicated allocation spreadsheet; still link parents to official pages.
FALLBACK_BY_COUNCIL_KEY: dict[str, dict[str, str]] = {
    "kingston upon thames": {
        "la_slug": "kingston_upon_thames",
        "data_source_url": "https://www.kingston.gov.uk/schools-education/school-admissions-arrangements",
        "statistics_page_url": "https://www.kingston.gov.uk/schools-education/apply-secondary-school-place",
    },
    "kent": {
        "la_slug": "kent",
        "data_source_url": "https://www.kent.gov.uk/education-and-children/schools/school-places/secondary-school-places",
        "statistics_page_url": "https://www.kent.gov.uk/education-and-children/schools/school-places/admissions-criteria",
    },
    "hertfordshire": {
        "la_slug": "hertfordshire",
        "data_source_url": "https://www.hertfordshire.gov.uk/services/schools-and-education/school-admissions/secondary-admissions.aspx",
        "statistics_page_url": "https://www.hertfordshire.gov.uk/services/schools-and-education/school-admissions.aspx",
    },
}

GUIDANCE_LINES = [
    "This council does not publish a Buckinghamshire-style ‘allocation profile’ XLSX per school in the same way.",
    "Use the source links for the coordinated scheme, national offer day information, and any school-level statistics the authority publishes.",
]


def council_key_from_row(local_authority: str | None, council_name: str | None) -> str | None:
    raw = (council_name or local_authority or "").strip().lower()
    return raw or None


def run(cur, *, entry_year: int, dry_run: bool = False) -> tuple[int, list[str]]:
    cur.execute(
        """
        SELECT id, name, school_code, local_authority, council_name
        FROM schools
        """
    )
    schools = cur.fetchall()

    targets: list[tuple[int, str, str, dict[str, str]]] = []
    for sid, name, urn, la, cn in schools:
        key = council_key_from_row(la, cn)
        if not key or key not in FALLBACK_BY_COUNCIL_KEY:
            continue
        targets.append((int(sid), name, str(urn or ""), FALLBACK_BY_COUNCIL_KEY[key]))

    if dry_run:
        print(f"[fallback] Would refresh {len(targets)} schools: {[t[1] for t in targets]}")
        return len(targets), []

    slugs = {cfg["la_slug"] for (_sid, _name, _urn, cfg) in targets}
    for slug in slugs:
        cur.execute("DELETE FROM admissions_allocation_history WHERE la_slug = %s", (slug,))

    n = 0
    for sid, _name, urn, cfg in targets:
        cur.execute(
            common.INSERT_SQL,
            (
                sid,
                entry_year,
                urn,
                cfg["la_slug"],
                1,
                "march_national",
                "Council admissions hub (automated placeholder)",
                "Local authority admissions information",
                json.dumps(GUIDANCE_LINES),
                cfg["data_source_url"],
                cfg["statistics_page_url"],
            ),
        )
        n += 1

    common.ensure_refresh_log(
        cur,
        "admission_allocation_council_fallback",
        "Council admissions pages — guidance rows where no XLSX pipeline exists",
        [
            {"label": "Kingston admissions arrangements", "url": FALLBACK_BY_COUNCIL_KEY["kingston upon thames"]["data_source_url"]},
            {"label": "Kent secondary school places", "url": FALLBACK_BY_COUNCIL_KEY["kent"]["data_source_url"]},
            {"label": "Hertfordshire school admissions", "url": FALLBACK_BY_COUNCIL_KEY["hertfordshire"]["data_source_url"]},
        ],
        "server/scripts/load_admission_allocations.py (fallback)",
        "Placeholder line_items until a borough-specific parser is added. Uses --fallback-entry-year for entry_year.",
    )
    common.touch_refresh_log(cur, "admission_allocation_council_fallback")
    return n, []
