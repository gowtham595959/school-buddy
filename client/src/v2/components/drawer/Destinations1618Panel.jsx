import React, { useMemo, useState } from "react";
import { useDestinations1618 } from "../../domains/destinations1618/useDestinations1618";

function fmtPct(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function Row({ label, value, title }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="v2-gcse-value" title={title || undefined}>
        {value}
      </td>
    </tr>
  );
}

export default function Destinations1618Panel({ schoolId, school }) {
  const { rows, loading, error } = useDestinations1618(schoolId, Boolean(schoolId));

  const hasSchoolOxbridge =
    school &&
    (school.oxbridge_offers != null ||
      (school.source_url_oxbridge_offers != null && String(school.source_url_oxbridge_offers).trim() !== ""));

  const tabYears = useMemo(() => {
    const ys = [...new Set(rows.map((r) => Number(r.year_tab)).filter((y) => Number.isFinite(y)))];
    ys.sort((a, b) => b - a);
    return ys;
  }, [rows]);

  const byYear = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      if (r.year_tab != null) m.set(Number(r.year_tab), r);
    }
    return m;
  }, [rows]);

  const firstTab = tabYears[0] ?? null;

  const [tab, setTab] = useState(firstTab ?? 0);

  React.useEffect(() => {
    if (firstTab != null) setTab(firstTab);
  }, [firstTab]);

  if (loading) {
    return <div className="v2-muted">Loading post-18 destinations…</div>;
  }
  if (error) {
    return <div className="v2-muted">Could not load destinations.</div>;
  }

  if (rows.length === 0 && !hasSchoolOxbridge) {
    return (
      <div className="v2-muted">
        No DfE destination data in the database for this school yet. Run{" "}
        <code className="v2-code">server/scripts/load_school_1618_destinations_dfe.py</code>; URNs must match{" "}
        <code className="v2-code">schools.school_code</code>.
      </div>
    );
  }

  const row = byYear.get(tab);

  const schoolOxbridgeBlock =
    hasSchoolOxbridge ? (
      <>
        <p className="v2-muted" style={{ fontSize: 12, marginBottom: 10 }}>
          <strong>Oxbridge offers</strong> below are from the school’s own site (not DfE). Figures refer to the cohort
          year stated on the page when given.
        </p>
        <table className="v2-gcse-table" style={{ marginBottom: rows.length ? 16 : 0 }}>
          <tbody>
            <Row
              label="Oxbridge offers (school)"
              value={school.oxbridge_offers != null ? String(school.oxbridge_offers) : "—"}
            />
            <Row
              label="Source"
              value={
                school.source_url_oxbridge_offers ? (
                  <a
                    className="v2-drawer-link"
                    href={school.source_url_oxbridge_offers}
                    target="_blank"
                    rel="noreferrer"
                  >
                    School Oxbridge / destinations page →
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </tbody>
        </table>
      </>
    ) : null;

  if (rows.length === 0) {
    return <div className="v2-gcse-panel">{schoolOxbridgeBlock}</div>;
  }

  return (
    <div className="v2-gcse-panel">
      {schoolOxbridgeBlock}

      {tabYears.length > 1 ? (
        <div className="v2-gcse-tabs" role="tablist" aria-label="Destinations cohort year">
          {tabYears.map((y) => (
            <button
              key={y}
              type="button"
              role="tab"
              aria-selected={tab === y}
              className={`v2-gcse-tab${tab === y ? " v2-gcse-tab--active" : ""}`}
              onClick={() => setTab(y)}
            >
              {y}
            </button>
          ))}
        </div>
      ) : null}

      {!row ? (
        <p className="v2-muted v2-gcse-footnote">No row for this year.</p>
      ) : (
        <>
          <p className="v2-muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Official <strong>16–18 destination measures</strong> (sustained education, training, or employment in the
            DfE window after leaving). Figures are for the cohort that finished 16–18 in{" "}
            <strong>{row.academic_year_label}</strong>
            {row.qualification_breakdown ? (
              <>
                , headline <strong>{row.qualification_breakdown}</strong> leavers where published.
              </>
            ) : (
              "."
            )}{" "}
            Oxford/Cambridge offer counts are <strong>not</strong> in this dataset.
          </p>

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
                  View 16–18 destinations (DfE) →
                </a>
              ) : (
                "—"
              )}
            </span>
          </div>

          <table className="v2-gcse-table">
            <tbody>
              <Row
                label="Students in headline cohort"
                value={row.leavers_student_count != null ? String(row.leavers_student_count) : "—"}
                title="DfE cohort count on the percentage row (students included in the headline breakdown)."
              />
              <Row
                label="Sustained education, apprenticeship or employment"
                value={fmtPct(row.pct_overall)}
                title="DfE 'overall' — students in a sustained positive destination."
              />
              <Row label="Sustained education (total)" value={fmtPct(row.pct_education)} />
              <Row label="— Higher education" value={fmtPct(row.pct_he)} />
              <Row label="— Further education" value={fmtPct(row.pct_fe)} />
              <Row label="— Other education" value={fmtPct(row.pct_other_education)} />
              <Row label="Sustained apprenticeship" value={fmtPct(row.pct_apprenticeship)} />
              <Row label="Sustained employment" value={fmtPct(row.pct_employment)} />
              <Row label="Not a sustained destination" value={fmtPct(row.pct_not_sustained)} />
              <Row label="Activity not captured" value={fmtPct(row.pct_unknown)} />
            </tbody>
          </table>

          {row.la_name ? (
            <p className="v2-muted" style={{ fontSize: 12, marginTop: 10 }}>
              Local authority in file: {row.la_name}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
