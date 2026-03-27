// client/src/v2/components/drawer/AllocationPanel.jsx

import React, { useMemo, useState } from "react";
import { isExamSectionEnabled, flattenAllocationSnapshot } from "../../utils/examDetailsUtils";

/**
 * 11+ allocation: cohort year toggles + allocation snapshot (from admissions_policies).
 */
export default function AllocationPanel({ policies, loading, error }) {
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

  const allocRows = useMemo(() => flattenAllocationSnapshot(policy?.allocation_snapshot), [policy?.allocation_snapshot]);

  if (loading) {
    return (
      <div className="v2-catchment-panel">
        <div className="v2-muted">Loading allocation details…</div>
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

  const showAlloc = policy && isExamSectionEnabled(policy.show_stage_allocation);

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
        {!showAlloc ? (
          <div className="v2-detail-section v2-catchment-block-first">
            <div className="v2-muted">
              Allocation snapshot is off for this year (enable show_stage_allocation in DB when ready).
            </div>
          </div>
        ) : null}

        {showAlloc && allocRows.length ? (
          <div className="v2-detail-section v2-catchment-priority-block v2-catchment-block-first">
            <div className="v2-detail-section-title">Allocation snapshot</div>
            {allocRows.map((r) => (
              <div className="v2-detail-row" key={r.key}>
                <span className="v2-detail-label">{r.label}</span>
                <span className="v2-detail-value">{r.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {showAlloc && !allocRows.length ? (
          <div className="v2-detail-section v2-catchment-priority-block v2-catchment-block-first">
            <div className="v2-detail-section-title">Allocation snapshot</div>
            <div className="v2-muted">No snapshot in data yet.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
