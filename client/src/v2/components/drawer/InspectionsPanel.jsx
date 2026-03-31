import React from "react";
import { useInspections } from "../../domains/inspections/useInspections";

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function InspectionsPanel({ schoolId, enabled }) {
  const { rows, loading, error } = useInspections(schoolId, Boolean(enabled && schoolId));

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="v2-catchment-panel">
        <div className="v2-muted">Loading inspections…</div>
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
        <div className="v2-muted">No inspection rows in data yet.</div>
      </div>
    );
  }

  return (
    <div className="v2-catchment-panel v2-inspections-panel">
      {rows.map((r) => (
        <div key={r.id} className="v2-inspection-card">
          <div className="v2-detail-row">
            <span className="v2-detail-label">Overall (published)</span>
            <span className="v2-detail-value">{r.overall_grade || "— (see report)"}</span>
          </div>
          <div className="v2-detail-row">
            <span className="v2-detail-label">Inspection date</span>
            <span className="v2-detail-value">{fmtDate(r.inspection_date)}</span>
          </div>
          <div className="v2-detail-row v2-inspection-links">
            <span className="v2-detail-label">Links</span>
            <span className="v2-detail-value v2-inspection-links-stack">
              {r.report_url ? (
                <a className="v2-drawer-link" href={r.report_url} target="_blank" rel="noreferrer">
                  Ofsted inspection report (provider page) →
                </a>
              ) : null}
              {r.establishment_url ? (
                <a className="v2-drawer-link" href={r.establishment_url} target="_blank" rel="noreferrer">
                  Get Information about Schools (DfE) →
                </a>
              ) : null}
            </span>
          </div>
        </div>
      ))}
      <p className="v2-muted v2-inspections-lead">
        England: statutory inspections for state-funded schools are published by{" "}
        <strong>{rows[0]?.inspection_body || "Ofsted"}</strong>. Headline grades and frameworks change over time —
        always read the linked report.
      </p>
    </div>
  );
}
