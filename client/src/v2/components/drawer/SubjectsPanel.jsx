import React, { useMemo } from "react";
import { useSchoolSubjects } from "../../domains/schoolSubjects/useSchoolSubjects";
import { displaySubjectName } from "../../utils/subjectDisplayName";

function normalizeSourceUrls(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((x) => x && x.url);
  return [];
}

function fmtEntries(n) {
  if (n == null || n === "") return "—";
  const x = Number(n);
  return Number.isFinite(x) ? String(x) : "—";
}

/** Single-line ellipsis inside the cell; full value on hover (native tooltip). */
function ClampedCell({ children, title }) {
  return (
    <span className="v2-subjects-table__cell-clamp" title={title}>
      {children}
    </span>
  );
}

function SubjectsTable({ rows }) {
  return (
    <div className="v2-subjects-table-wrap">
      <table className="v2-subjects-table">
        <thead>
          <tr>
            <th scope="col">Subject</th>
            <th scope="col">Qualification</th>
            <th scope="col" className="v2-subjects-table__num">
              Entries
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const subj = displaySubjectName(r.subject_name);
            const qual = r.qualification || "—";
            return (
              <tr key={r.id}>
                <td>
                  <ClampedCell title={subj}>{subj}</ClampedCell>
                </td>
                <td>
                  <ClampedCell title={qual}>{qual}</ClampedCell>
                </td>
                <td className="v2-subjects-table__num">{fmtEntries(r.entries)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SubjectsPanel({ schoolId, enabled }) {
  const { rows, loading, error } = useSchoolSubjects(schoolId, Boolean(enabled && schoolId));

  const { gcseRows, alevelRows, gcseFootnotes, sourceUrls } = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const gcse = [];
    const alevel = [];
    for (const r of list) {
      if (r.level === "alevel") alevel.push(r);
      else gcse.push(r);
    }
    const notes = [...new Set(gcse.map((r) => r.notes).filter(Boolean))];
    const first = list[0];
    const urls = normalizeSourceUrls(first?.source_urls);
    return { gcseRows: gcse, alevelRows: alevel, gcseFootnotes: notes, sourceUrls: urls };
  }, [rows]);

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="v2-catchment-panel">
        <div className="v2-muted">Loading subjects…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="v2-catchment-panel">
        <div className="v2-muted" style={{ color: "#c00" }}>
          {error}
        </div>
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="v2-catchment-panel">
        <div className="v2-muted">No subject entries in data yet.</div>
      </div>
    );
  }

  return (
    <div className="v2-catchment-panel v2-subjects-panel">
      <div className="v2-detail-section v2-subjects-section">
        <div className="v2-detail-section-title">Subjects entered at A level and equivalent</div>
        {alevelRows.length ? (
          <SubjectsTable rows={alevelRows} />
        ) : (
          <p className="v2-muted">No post-16 subject rows in DfE data for this school (cohort in source file).</p>
        )}
      </div>

      <div className="v2-detail-section v2-subjects-section">
        <div className="v2-detail-section-title">Subjects entered at GCSE level and equivalent</div>
        {gcseRows.length ? <SubjectsTable rows={gcseRows} /> : (
          <p className="v2-muted">No Key Stage 4 rows in DfE data for this school.</p>
        )}
        <p className="v2-muted v2-subjects-dfe-footnote">
          <sup>1</sup> This list only includes qualifications that count towards the government&apos;s performance
          tables; IGCSEs, for example, which a lot of independent school pupils sit, are not included.
        </p>
        {gcseFootnotes.length ? (
          <div className="v2-subjects-context-notes">
            {gcseFootnotes.map((t) => (
              <p key={t} className="v2-muted v2-subjects-context-note">
                {t}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {sourceUrls.length ? (
        <div className="v2-detail-section v2-subjects-sources">
          <div className="v2-detail-section-title">Sources</div>
          <p className="v2-muted v2-subjects-sources-lead">
            Figures from DfE open data (Key stage 4 and 16–18 publications). Suppressed counts appear blank on Compare
            schools when cohorts are small.
          </p>
          <ul className="v2-subjects-source-list">
            {sourceUrls.map((s) => (
              <li key={s.url}>
                <a className="v2-drawer-link" href={s.url} target="_blank" rel="noreferrer">
                  {s.label || "Source"} →
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
