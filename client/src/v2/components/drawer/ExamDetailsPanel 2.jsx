// client/src/v2/components/drawer/ExamDetailsPanel.jsx

import React, { useMemo, useState } from "react";
import {
  isExamSectionEnabled,
  normalizeExamStages,
  flattenKeyDates,
  resolveKeyDatesForPanel,
  formatAdmissionTestYesNo,
  splitAssessmentForStages,
} from "../../utils/examDetailsUtils";

function externalHref(url) {
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  return u.startsWith("http") ? u : `https://${u}`;
}

function ExamInfoRow({ url }) {
  const href = externalHref(url);
  if (!href) return null;
  return (
    <div className="v2-detail-row">
      <span className="v2-detail-label">Exam Info</span>
      <span className="v2-detail-value">
        <a className="v2-drawer-link" href={href} target="_blank" rel="noreferrer">
          School exam information →
        </a>
      </span>
    </div>
  );
}

/** One detail row: italic subject names inline, optional note + link per subject. */
function SubjectsRowValue({ entries }) {
  if (!entries?.length) {
    return "—";
  }
  return (
    <>
      {entries.map((sub, i) => (
        <span key={`${sub.name}-${i}`}>
          {i > 0 ? <span className="v2-exam-subjects-sep"> · </span> : null}
          <em className="v2-exam-subjects-name">{sub.name}</em>
          {sub.note ? <span className="v2-exam-subjects-note"> ({sub.note})</span> : null}
          {sub.url ? (
            <>
              {" "}
              <a className="v2-drawer-link" href={externalHref(sub.url)} target="_blank" rel="noreferrer">
                {sub.linkLabel || "Mocks →"}
              </a>
            </>
          ) : null}
        </span>
      ))}
    </>
  );
}

/**
 * 11+ exam section: year toggles + blocks gated by admissions_policies.show_* flags.
 */
export default function ExamDetailsPanel({ policies, loading, error }) {
  const list = Array.isArray(policies) ? policies : [];

  const years = useMemo(() => {
    const ys = list.map((p) => p.entry_year).filter((y) => y != null);
    return Array.from(new Set(ys)).sort((a, b) => (b || 0) - (a || 0));
  }, [list]);

  const [selectedYear, setSelectedYear] = useState(null);

  const effectiveYear = useMemo(() => {
    if (selectedYear != null && years.includes(selectedYear)) return selectedYear;
    return years[0] ?? null;
  }, [years, selectedYear]);

  const policy = useMemo(() => {
    if (effectiveYear == null) return null;
    return list.find((p) => p.entry_year === effectiveYear) ?? null;
  }, [list, effectiveYear]);

  const stages = useMemo(() => normalizeExamStages(policy?.exam_stages), [policy?.exam_stages]);
  const dateRows = useMemo(() => flattenKeyDates(resolveKeyDatesForPanel(policy)), [policy]);

  const assessmentType = policy?.exam_assessment_type;
  const assessmentTrimmed = typeof assessmentType === "string" ? assessmentType.trim() : "";
  const assessmentPerStage = useMemo(
    () => splitAssessmentForStages(assessmentTrimmed, stages.length),
    [assessmentTrimmed, stages.length]
  );

  /** Same authority for every stage → show once above stages (Tiffin-style). */
  const sharedTestAuthority = useMemo(() => {
    if (!policy || !stages.length) return null;
    const resolved = stages.map(
      (s) => s.test_authority?.trim() || policy.test_authority?.trim() || "—"
    );
    const first = resolved[0];
    if (!first || first === "—") return null;
    return resolved.every((a) => a === first) ? first : null;
  }, [policy, stages]);

  if (loading) {
    return (
      <div className="v2-catchment-panel">
        <div className="v2-muted">Loading exam details…</div>
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

  if (!list.length) {
    return (
      <div className="v2-catchment-panel">
        <div className="v2-muted">No admissions policy rows for this school yet.</div>
      </div>
    );
  }

  const showDetails = policy && isExamSectionEnabled(policy.show_exam_details);
  const showDates = policy && isExamSectionEnabled(policy.show_exam_dates);
  const showNotes = policy && isExamSectionEnabled(policy.show_exam_notes);
  const notesText = policy ? String(policy.notes ?? "").trim() : "";

  const hasAnyBlock = showDetails || showDates || showNotes;

  return (
    <div className="v2-catchment-panel">
      {years.length > 0 ? (
        <div className="v2-catchment-year-toggles">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              className={`v2-catchment-year-btn ${y === effectiveYear ? "v2-catchment-year-btn--active" : ""}`}
              onClick={() => setSelectedYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
      ) : null}

      <div className="v2-catchment-content">
        {policy ? (
          <div className="v2-detail-section v2-catchment-block-first">
            {policy.policy_url ? (
              <div className="v2-detail-row" style={{ marginBottom: 4 }}>
                <span className="v2-detail-label">Admission policy</span>
                <span className="v2-detail-value">
                  <a className="v2-drawer-link" href={externalHref(policy.policy_url)} target="_blank" rel="noreferrer">
                    View admission policy →
                  </a>
                </span>
              </div>
            ) : null}
            {policy.total_intake != null ? (
              <div className="v2-detail-row" style={{ marginBottom: 4 }}>
                <span className="v2-detail-label">Total 11+ seats</span>
                <span className="v2-detail-value">{policy.total_intake}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {!hasAnyBlock ? (
          <div className="v2-detail-section">
            <div className="v2-muted">Exam section flags are off for this year (enable in DB when ready).</div>
          </div>
        ) : null}

        {showDetails ? (
          <div className="v2-detail-section v2-catchment-priority-block">
            <div className="v2-detail-section-title">Exam details</div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Entrance Test</span>
              <span className="v2-detail-value">{formatAdmissionTestYesNo(policy.admission_test)}</span>
            </div>
            {sharedTestAuthority ? (
              <>
                <div className="v2-detail-row">
                  <span className="v2-detail-label">Test conducted by</span>
                  <span className="v2-detail-value v2-exam-authority-value">{sharedTestAuthority}</span>
                </div>
                <ExamInfoRow url={policy.exam_info_url} />
              </>
            ) : null}
            {stages.length > 0 ? (
              <div className="v2-exam-stages-wrap">
                {stages.map((s, idx) => {
                  const authority = s.test_authority?.trim() || policy.test_authority?.trim() || "—";
                  const assessmentLine =
                    s.assessment_type?.trim() ||
                    (assessmentPerStage && assessmentPerStage[idx] != null && assessmentPerStage[idx] !== ""
                      ? assessmentPerStage[idx]
                      : assessmentTrimmed || "—");
                  return (
                    <div className="v2-exam-stage-block" key={`exam-stage-${idx}-${s.stage}`}>
                      <div className="v2-detail-section-title">Stage {s.stage}</div>
                      <div className="v2-detail-row v2-exam-subjects-row">
                        <span className="v2-detail-label">Subjects</span>
                        <span className="v2-detail-value">
                          <SubjectsRowValue entries={s.subjectEntries} />
                        </span>
                      </div>
                      {!sharedTestAuthority ? (
                        <>
                          <div className="v2-detail-row">
                            <span className="v2-detail-label">Test conducted by</span>
                            <span className="v2-detail-value v2-exam-authority-value">{authority}</span>
                          </div>
                          {idx === 0 ? <ExamInfoRow url={policy.exam_info_url} /> : null}
                        </>
                      ) : null}
                      <div className="v2-detail-row">
                        <span className="v2-detail-label">Assessment type</span>
                        <span className="v2-detail-value">{assessmentLine}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="v2-detail-row">
                  <span className="v2-detail-label">Test conducted by</span>
                  <span className="v2-detail-value v2-exam-authority-value">
                    {policy.test_authority?.trim() || "—"}
                  </span>
                </div>
                <ExamInfoRow url={policy.exam_info_url} />
                <div className="v2-detail-row">
                  <span className="v2-detail-label">Assessment type</span>
                  <span className="v2-detail-value">{assessmentTrimmed || "—"}</span>
                </div>
                <div className="v2-muted" style={{ marginTop: 8 }}>
                  No stages in data — add exam_stages (JSON) for subjects per stage.
                </div>
              </>
            )}
          </div>
        ) : null}

        {showDates && dateRows.length ? (
          <div className="v2-detail-section v2-catchment-priority-block">
            <div className="v2-detail-section-title">Key dates</div>
            {dateRows.map((r) => (
              <div className="v2-detail-row" key={r.key}>
                <span className="v2-detail-label">{r.label}</span>
                <span className="v2-detail-value">{r.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {showDates && !dateRows.length ? (
          <div className="v2-detail-section v2-catchment-priority-block">
            <div className="v2-detail-section-title">Key dates</div>
            <div className="v2-muted">No dates in data yet.</div>
          </div>
        ) : null}

        {showNotes ? (
          <div className="v2-detail-section v2-catchment-priority-block">
            <div className="v2-detail-section-title">Notes</div>
            {notesText ? (
              <div className="v2-detail-value" style={{ whiteSpace: "pre-wrap" }}>
                {notesText}
              </div>
            ) : (
              <div className="v2-muted">No notes in data yet.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
