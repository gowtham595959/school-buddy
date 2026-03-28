import React, { useMemo, useState } from "react";
import { useKs5Results } from "../../domains/ks5/useKs5Results";

/** Most recent cohort-end years only (tabs); older DfE years omitted on purpose. */
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

/** DfE value-added style score — treat z/x/c and non-numeric as not published. */
function fmtValueAdded(v) {
  if (v == null || v === "") return "Not published";
  const s = String(v).trim().toLowerCase();
  if (s === "z" || s === "x" || s === "c") return "Not published";
  const n = Number(v);
  if (!Number.isFinite(n)) return "Not published";
  return n.toFixed(2);
}

function fmtVaCi(low, high) {
  if (low == null || high == null || low === "" || high === "") return null;
  const ls = String(low).trim().toLowerCase();
  const hs = String(high).trim().toLowerCase();
  if (ls === "z" || hs === "z") return null;
  const a = Number(low);
  const b = Number(high);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return `${a.toFixed(2)} – ${b.toFixed(2)}`;
}

function truncateForTeaser(text, maxLen = 158) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > 48 ? cut.slice(0, lastSpace) : cut;
  return `${head} …`;
}

const MORE_ALEVEL_ITEMS = [
  {
    lead: "Official source",
    text: " Figures are from DfE “A level and other 16 to 18 results” (Explore Education Statistics): headline table plus, for A*/A/B entry shares, the institution subject & qualification file — same publication ZIP, not newspaper league tables.",
  },
  {
    lead: "A level cohort row",
    text: " We store the school row where exam cohort is A level and disadvantage is Total, so headline metrics match DfE’s A level institution view for that cohort.",
  },
  {
    lead: "Suppression",
    text: " Small groups may show as blank or “Not published” where DfE uses codes such as z in the CSV.",
  },
  {
    lead: "Sixth form scope",
    text: " Not every grammar school has a large A level cohort; some cells may be absent. National and LA context is on the same release pages.",
  },
];

function MoreAlevelBlurb({ laName }) {
  const laTrimmed =
    laName != null && String(laName).trim() !== "" ? String(laName).trim() : null;
  const fullText =
    MORE_ALEVEL_ITEMS.map((item) => item.lead + item.text).join(" ") +
    (laTrimmed != null
      ? ` Local authority in DfE data: ${laTrimmed}.`
      : "");
  const teaser = truncateForTeaser(fullText, 158);
  return (
    <div className="v2-gcse-more-dfe">
      <p className="v2-gcse-more-dfe__title">Trust &amp; context (official statistics)</p>
      <div className="v2-gcse-more-dfe__hover" tabIndex={0}>
        <p className="v2-gcse-more-dfe__teaser">{teaser}</p>
        <div className="v2-gcse-more-dfe__popover" role="tooltip">
          <ul className="v2-gcse-more-dfe__popover-list">
            {MORE_ALEVEL_ITEMS.map((item) => (
              <li key={item.lead} className="v2-gcse-more-dfe__popover-item">
                <strong>{item.lead}</strong>
                {item.text}
              </li>
            ))}
          </ul>
          {laTrimmed != null ? (
            <p className="v2-gcse-more-dfe__popover-la">
              <strong>Local authority</strong> in DfE data: {laTrimmed}.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ExplainTd({ title, children }) {
  return (
    <td className="v2-gcse-explain">
      <div className="v2-gcse-explain__clamp" title={title}>
        {children}
      </div>
    </td>
  );
}

const TT = {
  alAstar:
    "Department for Education open data: share of counted GCE A level exam entries at grade A*. Built from institution_subject_and_qualification_results (grade lines + Total exam entries per subject). Each entry counts once — not a pupil headcount. Denominator = sum of Total exam entries across GCE A level subjects.",
  alAstarA:
    "Same counted GCE A level exam entries: percentage at grade A* or A.",
  alAstarB:
    "Same counted GCE A level exam entries: percentage at grade A*, A or B.",
  apsStud:
    "Students counted for the average point score per A level entry measure (DfE field aps_per_entry_student_count). This is the cohort that feeds APS and related A level headlines below. The broader end-of-16–18 student total (end1618_student_count) can differ — see DfE methodology.",
  aps:
    "DfE average point score per A level entry — higher means stronger average grades (official points scale).",
  avgGrade:
    "Departmental summary grade for the same average point score per A level entry (DfE aps_per_entry_grade).",
  apsBest3:
    "DfE average points for students’ best three A levels (best_three_alevels_aps).",
  avgGradeBest3:
    "DfE summary grade for best three A levels (best_three_alevels_grade).",
  best3:
    "Best three A levels: DfE average point score and grade for students’ best three A levels (where published for this cohort).",
  aab:
    "DfE percentage achieving AAB or better in at least three A levels including two facilitating subjects — see that year’s technical guide for exact rules.",
  ret1:
    "Retention: percentage of students retained for a second year in their 16–18 programme (DfE headline field).",
  retAsm:
    "Students retained and assessed — DfE retained_assessed_percent where published.",
  va:
    "A level value added: progress versus national average for students with similar prior attainment. About 0 = in line with national expectation. Brackets show 95% confidence range where published.",
  band: "DfE progress banding label for the value-added measure (where published).",
};

export default function AlevelResultsPanel({ schoolId }) {
  const { rows, loading, error } = useKs5Results(schoolId, Boolean(schoolId));

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
    return <div className="v2-muted">Loading A level results…</div>;
  }
  if (error) {
    return <div className="v2-muted">Could not load A level results.</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="v2-muted">
        No A level / 16–18 data in the database for this school yet. Run{" "}
        <code className="v2-code">server/scripts/load_school_ks5_dfe.py</code> after migrations; URNs must match{" "}
        <code className="v2-code">schools.school_code</code>.
      </div>
    );
  }

  const row = byYear.get(tab);

  return (
    <div className="v2-gcse-panel">
      <div className="v2-gcse-tabs" role="tablist" aria-label="A level results year">
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
        <p className="v2-muted v2-gcse-footnote">No row for this cohort in the loaded DfE data.</p>
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
                  View 16–18 (DfE) statistics →
                </a>
              ) : (
                "—"
              )}
            </span>
          </div>
          <table className="v2-gcse-table">
            <tbody>
              <tr>
                <th scope="row">Students included</th>
                <td className="v2-gcse-value" colSpan={2} title={TT.apsStud}>
                  {row.aps_per_entry_student_count != null ? row.aps_per_entry_student_count : "—"}
                </td>
              </tr>
              <tr>
                <th scope="row">% A* grades</th>
                <td className="v2-gcse-value">{fmtPct(row.alevel_entries_pct_grade_astar)}</td>
                <ExplainTd
                  title={
                    TT.alAstar +
                    (row.alevel_exam_entries_denominator != null
                      ? ` Denominator: ${row.alevel_exam_entries_denominator} counted A level entries.`
                      : "")
                  }
                >
                  <strong>DfE data:</strong> share of <strong>GCE A level exam entries</strong> at <strong>A*</strong>.
                  {row.alevel_exam_entries_denominator != null ? (
                    <span className="v2-gcse-ci">
                      {" "}
                      ({row.alevel_exam_entries_denominator} entries in total)
                    </span>
                  ) : null}
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">% A* or A</th>
                <td className="v2-gcse-value">{fmtPct(row.alevel_entries_pct_grade_astar_a)}</td>
                <ExplainTd title={TT.alAstarA}>
                  <strong>Same entries:</strong> share at <strong>A* or A</strong>.
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">% A*, A or B</th>
                <td className="v2-gcse-value">{fmtPct(row.alevel_entries_pct_grade_astar_a_b)}</td>
                <ExplainTd title={TT.alAstarB}>
                  <strong>Same entries:</strong> share at <strong>A*, A or B</strong>.
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">Average points</th>
                <td className="v2-gcse-value">{fmtNum(row.aps_per_entry, 2)}</td>
                <ExplainTd title={TT.aps}>
                  Official <strong>average point score</strong> per A level entry (DfE). Higher = better average grades.
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">Average grade</th>
                <td className="v2-gcse-value">
                  {row.aps_per_entry_grade != null && row.aps_per_entry_grade !== "" ? row.aps_per_entry_grade : "—"}
                </td>
                <ExplainTd title={TT.avgGrade}>
                  Overall <strong>average grade</strong> label for those entries (DfE).
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">Average points (best 3)</th>
                <td className="v2-gcse-value">{fmtNum(row.best_three_alevels_aps, 2)}</td>
                <ExplainTd title={TT.apsBest3}>
                  Average points for each student’s <strong>best three</strong> A levels (DfE).
                  {row.best_three_alevels_student_count != null ? (
                    <span className="v2-gcse-ci"> (n={row.best_three_alevels_student_count})</span>
                  ) : null}
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">Average grade (best 3)</th>
                <td className="v2-gcse-value">
                  {row.best_three_alevels_grade != null && row.best_three_alevels_grade !== ""
                    ? row.best_three_alevels_grade
                    : "—"}
                </td>
                <ExplainTd title={TT.avgGradeBest3}>
                  Average grade for those <strong>best three</strong> A levels (DfE).
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">AAB or better</th>
                <td className="v2-gcse-value">{fmtPct(row.aab_percent)}</td>
                <ExplainTd title={TT.aab}>
                  DfE <strong>AAB</strong> measure (three A levels; two must be ‘facilitating’ subjects — see official
                  methodology).
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">Stayed for second year</th>
                <td className="v2-gcse-value">{fmtPct(row.retained_percent)}</td>
                <ExplainTd title={TT.ret1}>
                  <strong>% retained</strong> for a second year (DfE headline).
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">Stayed and were assessed</th>
                <td className="v2-gcse-value">{fmtPct(row.retained_assessed_percent)}</td>
                <ExplainTd title={TT.retAsm}>
                  <strong>Retained and assessed</strong> percentage where published.
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">Progress</th>
                <td className="v2-gcse-value">
                  {fmtValueAdded(row.value_added)}
                  {(() => {
                    const ci = fmtVaCi(row.value_added_lower_ci, row.value_added_upper_ci);
                    return ci ? <span className="v2-gcse-ci"> ({ci})</span> : null;
                  })()}
                </td>
                <ExplainTd title={TT.va}>
                  <strong>Value added</strong> vs national for similar prior attainment. <strong>0</strong> ≈ national; brackets =
                  95% CI.
                </ExplainTd>
              </tr>
              <tr>
                <th scope="row">Progress band</th>
                <td className="v2-gcse-value">
                  {row.progress_banding != null && row.progress_banding !== "" ? row.progress_banding : "—"}
                </td>
                <ExplainTd title={TT.band}>
                  DfE <strong>band label</strong> for A level value added (where published).
                </ExplainTd>
              </tr>
            </tbody>
          </table>

          <MoreAlevelBlurb laName={row.la_name} />
        </>
      )}
    </div>
  );
}
