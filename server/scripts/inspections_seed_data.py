"""
Curated latest Ofsted section-5 style overall grades and inspection dates (England).
Always verify on the live Ofsted provider page — frameworks and reporting formats change.

report_url pattern: https://reports.ofsted.gov.uk/provider/23/{URN}
establishment_url: GIAS establishment record for the URN.

summary column in DB is not shown in the app (date, overall, and report links only).
"""
from __future__ import annotations

# (school_id, school_name, urn, inspection_date_iso, overall_grade, summary, inspection_body)
# overall_grade may be None where a single headline is not published or should be read on the report.
# summary is always empty — kept only so loaders match the table shape.
ROWS: list[tuple] = [
    (1, "The Tiffin Girls' School", "136615", "2021-10-14", "Outstanding", "", "Ofsted"),
    (2, "Nonsuch High School for Girls", "136795", "2021-05-25", "Good", "", "Ofsted"),
    (3, "Wallington High School for Girls", "136789", "2025-03-19", "Outstanding", "", "Ofsted"),
    (
        6,
        "Gravesend Grammar School",
        "137099",
        "2025-03-18",
        None,
        "",
        "Ofsted",
    ),
    (7, "Wilson's School", "136621", "2022-09-28", "Outstanding", "", "Ofsted"),
    (8, "Aylesbury Grammar School", "136884", "2022-11-02", "Outstanding", "", "Ofsted"),
    (9, "Aylesbury High School", "136846", "2023-12-06", "Outstanding", "", "Ofsted"),
    (10, "Beaconsfield High School", "140893", "2024-12-03", "Outstanding", "", "Ofsted"),
    (11, "Burnham Grammar School", "137564", "2022-12-06", "Good", "", "Ofsted"),
    (12, "Chesham Grammar School", "137091", "2025-03-04", "Outstanding", "", "Ofsted"),
    (13, "Dr Challoner's Grammar School", "136419", "2024-11-06", "Outstanding", "", "Ofsted"),
    (14, "Dr Challoner's High School", "137219", "2023-11-21", "Outstanding", "", "Ofsted"),
    (15, "John Hampden Grammar School", "136771", "2022-09-15", "Outstanding", "", "Ofsted"),
    (16, "The Royal Grammar School, High Wycombe", "136484", "2025-02-25", "Good", "", "Ofsted"),
    (17, "Royal Latin School", "137344", "2022-11-15", "Good", "", "Ofsted"),
    (18, "Sir Henry Floyd Grammar School", "136845", "2024-02-20", "Outstanding", "", "Ofsted"),
    (19, "Sir William Borlase's Grammar School", "136781", "2024-05-02", "Outstanding", "", "Ofsted"),
    (20, "Wycombe High School", "136723", "2024-05-01", "Outstanding", "", "Ofsted"),
    (21, "Dame Alice Owen's School", "136554", "2023-12-06", "Outstanding", "", "Ofsted"),
    (22, "Sutton Grammar School", "136787", "2022-06-23", "Good", "", "Ofsted"),
]


def ofsted_provider_url(urn: str) -> str:
    return f"https://reports.ofsted.gov.uk/provider/23/{urn}"


def gias_url(urn: str) -> str:
    return (
        "https://get-information-schools.service.gov.uk/Establishments/Establishment/Details/"
        + urn.strip()
    )
