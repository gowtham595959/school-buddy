"""
Static subject-entry seeds (Key Stage 4 + 16–18): curriculum lines as GCSE rows, optional A level rows.
DfE “subjects entered” links use Compare school and college performance paths (may require browser).
"""
from __future__ import annotations

GIAS = "https://get-information-schools.service.gov.uk/Establishments/Establishment/Details"


def dfe_ks4_subjects_url(urn: str, slug: str) -> str:
    return (
        "https://www.compare-school-performance.service.gov.uk/"
        f"school/{urn}/{slug}/secondary/subjects-entered"
    )


def dfe_ks5_subjects_url(urn: str, slug: str) -> str:
    return (
        "https://www.compare-school-performance.service.gov.uk/"
        f"school/{urn}/{slug}/16-to-18/subjects-entered"
    )


def src_school_dfe(urn: str, slug: str, school_page: str) -> list[dict[str, str]]:
    return [
        {"label": "School curriculum / options", "url": school_page},
        {"label": "DfE — subjects entered at Key Stage 4 (national data)", "url": dfe_ks4_subjects_url(urn, slug)},
        {"label": "DfE — subjects entered at 16–18 (national data)", "url": dfe_ks5_subjects_url(urn, slug)},
        {"label": "Get Information about Schools (DfE)", "url": f"{GIAS}/{urn}"},
    ]


# Shared optional blocks (grammar schools — simplify where school site is thin)
OPT_ARTS_HUM = [
    "Geography",
    "History",
    "Religious Studies",
    "French",
    "German",
    "Spanish",
    "Latin",
    "Ancient History",
    "Computer Science",
    "Business",
    "Economics",
    "Drama / Theatre Studies",
    "Music",
    "Art and Design (Fine Art)",
    "Design and Technology",
    "Food Preparation and Nutrition",
    "Physical Education / Sports Studies",
    "Statistics",
    "Astronomy",
]


def SCHOOL_SPECS() -> list[dict]:
    """Each dict includes mandatory/optional (KS4 lines), optional counts, and optional alevel rows (subject, qualification, entries)."""
    specs: list[dict] = []

    def add(
        sid: int,
        urn: str,
        name: str,
        page: str,
        slug: str,
        man: list[str],
        opt: list[str],
        *,
        tier: str = "school",
        counts: dict[str, int] | None = None,
        notes: dict[str, str] | None = None,
        alevel: list[tuple[str | None, str, int | None]] | None = None,
    ):
        specs.append(
            {
                "school_id": sid,
                "school_urn": urn,
                "school_name": name,
                "page": page,
                "slug": slug,
                "tier": tier,
                "mandatory": man,
                "optional": opt,
                "counts": counts or {},
                "row_notes": notes or {},
                "alevel": list(alevel or []),
            }
        )

    core_triple = [
        "English Language",
        "English Literature",
        "Mathematics",
        "Biology",
        "Chemistry",
        "Physics",
        "Modern foreign language (one)",
    ]

    add(
        1,
        "136615",
        "The Tiffin Girls' School",
        "https://www.tiffingirls.org/academic/subject-departments/",
        "the-tiffin-girls--school",
        core_triple
        + [
            "Core non-examined: PSHE, PE (where not taken as GCSE), pastoral programme",
        ],
        [
            "Art and Design (Fine Art)",
            "Computer Science",
            "Design and Technology",
            "Drama / Theatre Studies",
            "Geography",
            "History",
            "Latin",
            "Music",
            "Physical Education / Sports Studies",
            "Religious Studies",
            "French",
            "Spanish",
            "Japanese",
            "Portuguese",
            "Additional Mathematics (FSMQ, capped group)",
        ],
        counts={
            "French": 114,
            "Geography": 86,
            "History": 84,
            "Spanish": 70,
            "Religious Studies": 68,
        },
        notes={
            "_": "GCSE option entry counts shown where listed are from DfE Key Stage 4 subject tables (recent year on Compare school performance) — use DfE link for exact cohort year.",
        },
    )

    add(
        2,
        "136795",
        "Nonsuch High School for Girls",
        "https://www.nonsuchschool.org/page/?pid=30&title=Year+9+Options+Process",
        "nonsuch-high-school-for-girls",
        [
            "English Language",
            "English Literature",
            "Mathematics",
            "Biology",
            "Chemistry",
            "Physics",
            "Modern foreign language (one of French, German, Spanish)",
            "Level 2 Higher Project Qualification (HPQ)",
            "Core PE (non GCSE)",
            "Religious Education / PSHE (including assemblies and tutorials)",
        ],
        [
            "German",
            "Spanish",
            "French",
            "Geography",
            "History",
            "Latin",
            "Fine Art",
            "Photography",
            "Music",
            "Drama",
            "Food Technology",
            "Product Design",
            "Design and Technology — Textiles",
            "Computer Science",
            "Astronomy",
            "Religious Studies (full GCSE where selected)",
            "Physical Education",
        ],
        notes={
            "_": "Option rules (e.g. not both Product Design and DT Textiles) — see school options booklet.",
        },
    )

    add(
        3,
        "136789",
        "Wallington High School for Girls",
        "https://www.wallingtonhigh.org.uk/",
        "wallington-high-school-for-girls",
        core_triple + ["Core PE / PSHE (non GCSE)"],
        OPT_ARTS_HUM + ["Psychology", "Further Mathematics (where offered in KS4)"],
        notes={
            "_": "Detailed option blocks are published in the school’s annual GCSE options booklet — site landing used as source when curriculum subpages are unavailable.",
        },
        alevel=[
            ("Mathematics", "GCE A level", 119),
            ("Chemistry", "GCE A level", 133),
            ("Biology", "GCE A level", 137),
            ("Physics", "GCE A level", 137),
            ("Psychology", "GCE A level", 57),
            ("Extended Project (Diploma)", "Extended Project qualification", 63),
        ],
    )

    add(
        6,
        "137099",
        "Gravesend Grammar School",
        "https://gravesendgrammar.com/curriculum/key-stage-4",
        "gravesend-grammar-school",
        [
            "English Language",
            "English Literature",
            "Mathematics",
            "Biology",
            "Chemistry",
            "Physics",
            "At least one humanity (History and/or Geography)",
            "A modern language",
            "Non examined: PE, PSHE, citizenship, careers",
        ],
        [
            "Art",
            "Business",
            "Computing / Computer Science",
            "Drama",
            "Design and Technology",
            "Economics",
            "French",
            "German",
            "Additional humanity if not taken as compulsory",
            "Music",
            "Psychology",
            "Religious Studies",
            "Spanish",
            "Physical Education",
        ],
    )

    add(
        7,
        "136621",
        "Wilson's School",
        "https://www.wilsons.school/the-curriculum/",
        "wilson-s-school",
        [
            "Biology",
            "Chemistry",
            "Physics",
            "English Language",
            "English Literature",
            "Mathematics",
            "French or German (through KS4)",
            "Geography and/or History (as per structure)",
            "Religious Education / Philosophy (including Year 11 Philosophy)",
            "The Elizabethan (political knowledge & public speaking)",
            "PE & Games (non GCSE)",
            "PSHE",
        ],
        [
            "Art",
            "Business",
            "Computing",
            "Design and Technology (AS Level 3 route in some cohorts)",
            "History (if not taken in core block)",
            "Geography (if not taken in core block)",
            "Latin",
            "Music",
            "Academic PE (GCSE)",
            "Spanish (additional MFL)",
        ],
    )

    add(
        8,
        "136884",
        "Aylesbury Grammar School",
        "https://www.ags.bucks.sch.uk/ags-school-life/gcse/",
        "aylesbury-grammar-school",
        [
            "English Language",
            "English Literature",
            "Mathematics",
            "Biology",
            "Chemistry",
            "Physics",
            "A modern language (from school’s MFL offer; includes community languages where applicable)",
        ],
        [
            "Ancient History",
            "Art and Design (Fine Art)",
            "Business",
            "Computer Science",
            "Drama / Theatre Studies",
            "Design & Technology — Food Technology",
            "Geography",
            "Geology",
            "History",
            "Latin",
            "Music",
            "Physical Education / Sports Studies",
            "Religious Studies",
            "Statistics",
            "Applied Engineering (where offered)",
        ],
    )

    add(
        9,
        "136846",
        "Aylesbury High School",
        "https://www.ahl.bucks.sch.uk/",
        "aylesbury-high-school",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM,
    )

    add(
        10,
        "140893",
        "Beaconsfield High School",
        "https://www.beaconsfieldhigh.bucks.sch.uk/",
        "beaconsfield-high-school",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM,
    )

    add(
        11,
        "137564",
        "Burnham Grammar School",
        "https://www.burnhamgrammar.bucks.sch.uk/",
        "burnham-grammar-school",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM,
    )

    add(
        12,
        "137091",
        "Chesham Grammar School",
        "https://www.cheshamgrammar.org/5063/key-stage-4-years-10-11",
        "chesham-grammar-school",
        [
            "English Language",
            "English Literature",
            "Mathematics",
            "Biology",
            "Chemistry",
            "Physics",
            "A modern language (French, German or Spanish)",
            "Life Skills / PSHE and core PE",
        ],
        [
            "History",
            "Geography",
            "PRE (Personal and Religious Education pathway)",
            "Art",
            "Music",
            "Drama",
            "Engineering",
            "Food Technology",
            "Textiles",
            "Computer Science",
            "Physical Education",
        ],
    )

    add(
        13,
        "136419",
        "Dr Challoner's Grammar School",
        "https://www.challoners.org/",
        "dr-challoners-grammar-school",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM,
    )

    add(
        14,
        "137219",
        "Dr Challoner's High School",
        "https://www.challonershigh.com/",
        "dr-challoners-high-school",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM + ["Dance", "Photography"],
    )

    add(
        15,
        "136771",
        "John Hampden Grammar School",
        "https://www.jhgs.bucks.sch.uk/",
        "john-hampden-grammar-school",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM,
    )

    add(
        16,
        "136484",
        "The Royal Grammar School, High Wycombe",
        "https://www.rgshw.com/page/?pid=677&title=Examinations",
        "the-royal-grammar-school-high-wycombe",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM,
        notes={
            "_": "School subject page is sparse online; examinations page lists boards/spec codes — full option grid in school options materials.",
        },
    )

    add(
        17,
        "137344",
        "Royal Latin School",
        "https://www.rls.org.uk/",
        "royal-latin-school",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM,
    )

    add(
        18,
        "136845",
        "Sir Henry Floyd Grammar School",
        "https://www.shfgs.bucks.sch.uk/",
        "sir-henry-floyd-grammar-school",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM,
    )

    add(
        19,
        "136781",
        "Sir William Borlase's Grammar School",
        "https://www.swbgs.com/",
        "sir-william-borlase-s-grammar-school",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM + ["Sports Science", "Classical Civilisation"],
    )

    add(
        20,
        "136723",
        "Wycombe High School",
        "https://www.wycombehighschool.co.uk/",
        "wycombe-high-school",
        core_triple + ["Core PE / PSHE"],
        OPT_ARTS_HUM + ["Sociology", "Child Development", "Health and Social Care"],
    )

    add(
        21,
        "136554",
        "Dame Alice Owen's School",
        "https://damealiceowens.herts.sch.uk/academic-life/curriculum-overview/",
        "dame-alice-owen-s-school",
        [
            "English Language",
            "English Literature",
            "Mathematics",
            "Science (Triple or combined route — as per cohort)",
            "Core PE / PSHE",
        ],
        [
            "French",
            "German",
            "Spanish",
            "Italian",
            "Modern Greek",
            "Polish",
            "Russian",
            "Turkish",
            "History",
            "Geography",
            "Economics",
            "Religious Studies",
            "Drama / Theatre Studies",
            "Physics",
            "Chemistry",
            "Biology",
            "Art and Design",
            "Art and Design (Textiles)",
            "Music",
            "Design and Technology (including Food)",
            "Business Studies",
            "Computer Science / Computing",
            "Physical Education / Sports Studies",
        ],
        notes={
            "_": "Partially selective / bilateral school: banding and pathway detail is in the school’s admissions and options booklets.",
        },
    )

    add(
        22,
        "136787",
        "Sutton Grammar School",
        "https://www.suttongrammar.sutton.sch.uk/curriculum/",
        "sutton-grammar-school",
        [
            "English Language",
            "English Literature",
            "Mathematics",
            "Biology",
            "Chemistry",
            "Physics",
            "One modern foreign language (French, German or Spanish)",
            "PSHE / RE / citizenship / careers (mostly non GCSE)",
            "PE and games (non GCSE)",
        ],
        [
            "Geography",
            "History (iGCSE where applicable)",
            "Religious Studies",
            "Design and Technology",
            "Art or Photography",
            "Drama",
            "Music",
            "Physical Education",
            "Electronics (additional GCSE, where chosen)",
        ],
    )

    return specs
