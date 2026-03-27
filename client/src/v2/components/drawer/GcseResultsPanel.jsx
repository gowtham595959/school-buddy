import React, { useMemo, useState } from "react";
import { useGcseResults } from "../../domains/gcse/useGcseResults";

const TAB_ORDER = [2025, 2024, 2023];

function fmtPct(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtNum(v, digits = 1) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function fmtProgress8(v) {
  if (v == null || v === "") return "Not published";
  const s = String(v).trim().toLowerCase();
  if (s === "z" || s === "x" || s === "c") return "Not published";
  const n = Number(v);
  if (!Number.isFinite(n)) return "Not published";
  return n.toFixed(2);
}

function fmtProgress8Ci(low, high) {
  if (low == null || high == null || low === "" || high === "") return null;
  const ls = String(low).trim().toLowerCase();
  const hs = String(high).trim().toLowerCase();
  if (ls === "z" || hs === "z") return null;
  const a = Number(low);
  const b = Number(high);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return `${a.toFixed(2)} – ${b.toFixed(2)}`;
}

/** Plain one-paragraph teaser ending with " …"; full string on native tooltip. */
function truncateForTeaser(text, maxLen = 158) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > 48 ? cut.slice(0, lastSpace) : cut;
  return `${head} …`;
}

const MORE_DFE_ITEMS = [
  {
    lead: "National and local authority",
    text:
      " averages for the same indicators, and where published similar-school or comparator context, are in the Key Stage 4 performance open data and school pages on Explore Education Statistics.",
  },
  {
    lead: "Per-subject GCSE",
    text:
      " entries and outcomes (and some value-added measures where published) come from the subject-level files in the same release family; this panel’s grade-band rows summarise high-grade shares across counted GCSE entries at the school.",
  },
  {
    lead: "Pupil group splits",
    text:
      " (e.g. disadvantage, prior attainment, sex) appear in DfE breakdown tables where cohort size allows; small groups may be suppressed (shown blank).",
  },
  {
    lead: "Progress 8",
    text:
      " may show as not published when DfE suppresses or excludes the score (e.g. rules for cohort size or school type)—see the technical guide for that year rather than treating it as a data error.",
  },
  {
    lead: "Post-16 destinations",
    text:
      " are published in DfE destinations statistics (different dataset and timing from these GCSE headlines).",
  },
  {
    lead: "Multi-year trends",
    text:
      ": use the year tabs above when multiple cohorts are loaded; each keeps the same definitions for that year’s DfE release.",
  },
];

function MoreDfeBlurb({ laName }) {
  const laTrimmed =
    laName != null && String(laName).trim() !== "" ? String(laName).trim() : null;
  const fullText =
    MORE_DFE_ITEMS.map((item) => item.lead + item.text).join(" ") +
    (laTrimmed != null
      ? ` Local authority in DfE data: ${laTrimmed} (LA tables are in the same release).`
      : "");
  const teaser = truncateForTeaser(fullText, 158);
  return (
    <div className="v2-gcse-more-dfe">
      <p className="v2-gcse-more-dfe__title">More you can compare (same official sources)</p>
      <div className="v2-gcse-more-dfe__hover" tabIndex={0}>
        <p className="v2-gcse-more-dfe__teaser">{teaser}</p>
        <div className="v2-gcse-more-dfe__popover" role="tooltip">
          <ul className="v2-gcse-more-dfe__popover-list">
            {MORE_DFE_ITEMS.map((item) => (
              <li key={item.lead} className="v2-gcse-more-dfe__popover-item">
                <strong>{item.lead}</strong>
                {item.text}
              </li>
            ))}
          </ul>
          {laTrimmed != null ? (
            <p className="v2-gcse-more-dfe__popover-la">
              <strong>Local authority</strong> in DfE data: {laTrimmed} (LA tables are in the same release).
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Full plain-text for native tooltip (hover). Cell clamps to 2 lines. */
function GcseExplainTd({ title, children }) {
  return (
    <td className="v2-gcse-explain">
      <div className="v2-gcse-explain__clamp" title={title}>
        {children}
      </div>
    </td>
  );
}

const TT = {
  grade9:
    "Department for Education open data: percentage of counted GCSE (9–1) exam grades at this school that are grade 9. Counts standard full-course GCSEs and double award where included in the same source. Each qualification counts once (several subjects ⇒ several grades). Not a pupil headcount.",
  grades89:
    "Same counted GCSE grades as the row above: percentage at grade 8 or 9. Each grade line in the source is one exam result.",
  grades79:
    "Same counted GCSE grades: percentage at grade 7, 8 or 9. Official school-level figure from the same DfE subject file. Where shown after the value, the figure in parentheses is the total number of exam grades in the denominator.",
  grades69:
    "Same counted GCSE grades: percentage at grade 6, 7, 8 or 9.",
  att8:
    "Department for Education Attainment 8: headline points score for the cohort from a fixed set of subject slots—English counts twice, then maths, then EBacc slots, then other allowed qualifications. More points = stronger average performance. This is not a percentage pass rate.",
  eng7:
    "Approximate percentage of pupils with grade 7 or above in both English Language and Mathematics. The Department for Education headline school table used here publishes combined English and mathematics only at grade 5+ and 4+, not 7+. This value is estimated from the same DfE subject-level GCSE file as the grade-band rows: share of Mathematics entries at grades 7–9 and share of English Language entries at 7–9, then multiplied together (independence assumption between subjects). Not an official DfE combined headline; treat as indicative.",
  eng5:
    "Percentage of pupils in this cohort with at least grade 5 in both English and mathematics (DfE ‘strong pass’ threshold for this measure).",
  ebaccEnter:
    "Percentage of pupils entered for all English Baccalaureate components in DfE tables: English, mathematics, science, a humanity, and a language.",
  ebaccAps:
    "Average points across the five EBacc pillars using the DfE points scale; higher = stronger average across those subjects.",
  p8:
    "Progress 8: GCSE progress against the national average for pupils with similar key stage 2 prior attainment. About 0 = in line with national expectation; positive = above, negative = below. Figures in brackets are a 95% confidence interval (wider when the estimate is less certain, e.g. smaller cohorts).",
  eng4:
    "Percentage of pupils in this cohort with at least grade 4 in both English and mathematics (DfE ‘standard pass’ / Level 2 basics threshold for combined English and maths).",
  fiveEm4:
    "Percentage of pupils with five or more GCSEs at grade 4 or above, including English and mathematics, using DfE headline definitions (sometimes labelled ‘strong GCSE breadth’ style measure at grade 4+ including English and maths).",
  gcse91:
    "DfE headline percentage of pupils achieving grades 9 to 1 in GCSEs counted toward the school’s published performance figures (pass-grade threshold under the 9–1 scale). Exact inclusion rules are in the Key Stage 4 technical guide for the release year.",
};

export default function GcseResultsPanel({ schoolId }) {
  const { rows, loading, error } = useGcseResults(schoolId, Boolean(schoolId));

  const byYear = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      if (r.year_tab != null) m.set(Number(r.year_tab), r);
    }
    return m;
  }, [rows]);

  const firstAvailableTab = useMemo(() => {
    for (const y of TAB_ORDER) {
      if (byYear.has(y)) return y;
    }
    return TAB_ORDER[0];
  }, [byYear]);

  const [tab, setTab] = useState(2025);

  React.useEffect(() => {
    setTab(firstAvailableTab);
  }, [firstAvailableTab]);

  if (loading) {
    return <div className="v2-muted">Loading GCSE results…</div>;
  }
  if (error) {
    return <div className="v2-muted">Could not load GCSE results.</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="v2-muted">
        No GCSE data in the database for this school yet. Ensure DfE data is loaded and the school URN matches <code className="v2-code">schools.school_code</code>.
      </div>
    );
  }

  const row = byYear.get(tab);

  return (
    <div className="v2-gcse-panel">
      <div className="v2-gcse-tabs" role="tablist" aria-label="Results year">
        {TAB_ORDER.map((y) => (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={tab === y}
            className={`v2-gcse-tab${tab === y ? " v2-gcse-tab--active" : ""}${!byYear.has(y) ? " v2-gcse-tab--disabled" : ""}`}
            disabled={!byYear.has(y)}
            onClick={() => byYear.has(y) && setTab(y)}
          >
            {y}
          </button>
        ))}
      </div>

      {!row ? (
        <p className="v2-muted v2-gcse-footnote">
          No row for this cohort in DfE open data (2022/23 school-level headlines are not in the standard Explore Education Statistics ZIP).
        </p>
      ) : (
        <>
          <div className="v2-detail-row" style={{ marginBottom: 8 }}>
            <span className="v2-detail-label">Source of Data</span>
            <span className="v2-detail-value">
              {row.data_source_url ? (
                <a
                  className="v2-drawer-link"
                  href={row.data_source_url}
                  target="_blank"
                  rel="noreferrer"
                  title={`${row.academic_year_label}${row.version ? ` · ${row.version}` : ""} — Explore Education Statistics`}
                >
                  View Key Stage 4 (DfE) statistics →
                </a>
              ) : (
                "—"
              )}
            </span>
          </div>
          <table className="v2-gcse-table">
            <tbody>
              <tr>
                <th scope="row">Pupils Included</th>
                <td className="v2-gcse-value" colSpan={2}>
                  {row.pupil_count != null ? row.pupil_count : "—"}
                </td>
              </tr>
              <tr>
                <th scope="row">Grade 9</th>
                <td className="v2-gcse-value">{fmtPct(row.gcse_entries_pct_grade_9)}</td>
                <GcseExplainTd title={TT.grade9}>
                  <strong>DfE data:</strong> share of <strong>counted GCSE grades</strong> (each qualification once)
                  that are <strong>9</strong>. Not pupil numbers.
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">Grades 8–9</th>
                <td className="v2-gcse-value">{fmtPct(row.gcse_entries_pct_grade_8_9)}</td>
                <GcseExplainTd title={TT.grades89}>
                  <strong>Same grades:</strong> share at <strong>8 or 9</strong>.
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">Grades 7–9</th>
                <td className="v2-gcse-value">{fmtPct(row.gcse_entries_pct_grade_7_9)}</td>
                <GcseExplainTd
                  title={
                    TT.grades79 +
                    (row.gcse_exam_entries_denominator != null
                      ? ` Denominator: ${row.gcse_exam_entries_denominator} counted grades.`
                      : "")
                  }
                >
                  <strong>Same grades:</strong> share at <strong>7, 8 or 9</strong>.
                  {row.gcse_exam_entries_denominator != null ? (
                    <span className="v2-gcse-ci">
                      {" "}
                      ({row.gcse_exam_entries_denominator} grades in total)
                    </span>
                  ) : null}
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">Grades 6–9</th>
                <td className="v2-gcse-value">{fmtPct(row.gcse_entries_pct_grade_6_9)}</td>
                <GcseExplainTd title={TT.grades69}>
                  <strong>Same grades:</strong> share at <strong>6–9</strong>.
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">Attainment 8 (Average)</th>
                <td className="v2-gcse-value">{fmtNum(row.attainment8_average, 1)}</td>
                <GcseExplainTd title={TT.att8}>
                  <strong>DfE Attainment 8:</strong> cohort points score—English ×2, maths, EBacc slots, then others.
                  <strong> Higher = stronger.</strong> Not a %.
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">Grade 7+ English &amp; Maths</th>
                <td className="v2-gcse-value">{fmtPct(row.engmath_7_plus_percent)}</td>
                <GcseExplainTd title={TT.eng7}>
                  <strong>Approximate % of pupils</strong> with <strong>7+ in both</strong> English language and maths:
                  derived from DfE <strong>subject</strong> GCSE counts—not the headline combined figure (DfE only
                  publishes combined English &amp; maths for <strong>5+</strong> and <strong>4+</strong> there).{" "}
                  <strong>Indicative</strong>; see hover.
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">Grade 5+ English &amp; Maths</th>
                <td className="v2-gcse-value">{fmtPct(row.engmath_95_percent)}</td>
                <GcseExplainTd title={TT.eng5}>
                  <strong>% of pupils</strong> with at least <strong>5</strong> in <strong>both</strong> English and
                  maths (DfE strong pass).
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">Entering EBacc</th>
                <td className="v2-gcse-value">{fmtPct(row.ebacc_entering_percent)}</td>
                <GcseExplainTd title={TT.ebaccEnter}>
                  <strong>% of pupils</strong> entered for <strong>all EBacc parts</strong>: English, maths, science,
                  humanity, language (DfE definition).
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">EBacc Average Point Score</th>
                <td className="v2-gcse-value">{fmtNum(row.ebacc_aps_average, 2)}</td>
                <GcseExplainTd title={TT.ebaccAps}>
                  <strong>Mean EBacc points</strong> (DfE scale) across the five pillars. <strong>Higher = stronger.</strong>
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">Progress 8</th>
                <td className="v2-gcse-value">
                  {fmtProgress8(row.progress8_average)}
                  {(() => {
                    const ci = fmtProgress8Ci(row.progress8_lower_95_ci, row.progress8_upper_95_ci);
                    return ci ? <span className="v2-gcse-ci"> ({ci})</span> : null;
                  })()}
                </td>
                <GcseExplainTd title={TT.p8}>
                  <strong>Progress 8:</strong> vs national expectation from <strong>similar KS2 starting points</strong>.
                  <strong>0</strong> = average; <strong>+</strong> / <strong>−</strong> = above / below.{" "}
                  <strong>Brackets</strong> = 95% range (wider if uncertain, e.g. small cohort).
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">Grade 4+ English &amp; Maths</th>
                <td className="v2-gcse-value">{fmtPct(row.engmath_94_percent)}</td>
                <GcseExplainTd title={TT.eng4}>
                  <strong>% of pupils</strong> with at least <strong>4</strong> in <strong>both</strong> English and maths
                  (DfE standard pass / Level 2 basics for this combined measure).
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">5+ GCSEs at 4+ (incl. English &amp; Maths)</th>
                <td className="v2-gcse-value">{fmtPct(row.gcse_five_engmath_percent)}</td>
                <GcseExplainTd title={TT.fiveEm4}>
                  <strong>Breadth:</strong> % with <strong>five or more</strong> GCSEs at <strong>grade 4+</strong>,
                  including English and maths (DfE headline).
                </GcseExplainTd>
              </tr>
              <tr>
                <th scope="row">GCSE grades 9–1 (pupils)</th>
                <td className="v2-gcse-value">{fmtPct(row.gcse_91_percent)}</td>
                <GcseExplainTd title={TT.gcse91}>
                  <strong>DfE headline:</strong> % of pupils achieving <strong>grades 9–1</strong> in counted GCSEs
                  (9–1 pass threshold). See release <strong>methodology</strong> for definitions.
                </GcseExplainTd>
              </tr>
            </tbody>
          </table>

          <MoreDfeBlurb laName={row.la_name} />
        </>
      )}
    </div>
  );
}
