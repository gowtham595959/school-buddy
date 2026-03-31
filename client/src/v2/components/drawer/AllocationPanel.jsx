// client/src/v2/components/drawer/AllocationPanel.jsx

import React, { useMemo, useState } from "react";
import { isExamSectionEnabled, flattenAllocationSnapshot } from "../../utils/examDetailsUtils";

/** September admission years with council profile data (newest first). */
const ALLOCATION_HISTORY_TAB_YEARS = [2026, 2025, 2024, 2023];

function normalizeLineItems(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((x) => (typeof x === "string" ? x : x && x.text != null ? String(x.text) : null))
      .filter(Boolean);
  }
  return [];
}

function AllocationProfileHistory({ rows }) {
  const byYear = useMemo(() => {
    const m = new Map();
    for (const r of rows || []) {
      const yey = Number(r.entry_year);
      if (!Number.isFinite(yey)) continue;
      if (!m.has(yey)) m.set(yey, []);
      m.get(yey).push(r);
    }
    for (const list of m.values()) {
      list.sort((a, b) => (Number(a.round_order) || 0) - (Number(b.round_order) || 0));
    }
    return m;
  }, [rows]);

  const availableYears = useMemo(
    () => ALLOCATION_HISTORY_TAB_YEARS.filter((y) => byYear.has(y)),
    [byYear]
  );

  const [histYear, setHistYear] = useState(null);
  const effectiveHistYear = useMemo(() => {
    if (histYear != null && availableYears.includes(histYear)) return histYear;
    return availableYears[0] ?? null;
  }, [availableYears, histYear]);

  if (!rows?.length) return null;

  const yearRows = effectiveHistYear != null ? byYear.get(effectiveHistYear) || [] : [];
  const first = yearRows[0];
  const LA_SLUG_LABELS = {
    buckinghamshire: "Buckinghamshire Council",
    sutton: "London Borough of Sutton",
    kingston_upon_thames: "Royal Borough of Kingston upon Thames",
    kent: "Kent County Council",
    hertfordshire: "Hertfordshire County Council",
  };
  const laLabel =
    first?.la_slug && LA_SLUG_LABELS[first.la_slug]
      ? LA_SLUG_LABELS[first.la_slug]
      : first?.la_slug
        ? String(first.la_slug).replace(/_/g, " ")
        : "Local authority";

  return (
    <div className="v2-detail-section v2-catchment-priority-block v2-allocation-history-block">
      <div className="v2-detail-section-title">Council allocation profile</div>
      <p className="v2-muted v2-allocation-history-lead">
        How places were allocated for <strong>qualified selective applicants</strong>, from the local authority’s
        published allocation files (national offer day, then reallocation rounds where published).
      </p>

      {availableYears.length > 0 ? (
        <div className="v2-catchment-year-toggles v2-allocation-history-year-tabs">
          {ALLOCATION_HISTORY_TAB_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              disabled={!byYear.has(y)}
              className={`v2-catchment-year-btn ${y === effectiveHistYear ? "v2-catchment-year-btn--active" : ""}${
                !byYear.has(y) ? " v2-catchment-year-btn--disabled" : ""
              }`}
              onClick={() => byYear.has(y) && setHistYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
      ) : null}

      {yearRows.length ? (
        <>
          <div className="v2-detail-row" style={{ marginBottom: 6 }}>
            <span className="v2-detail-label">Authority</span>
            <span className="v2-detail-value">{laLabel}</span>
          </div>
          {first?.school_urn_live || first?.school_urn ? (
            <div className="v2-detail-row" style={{ marginBottom: 6 }}>
              <span className="v2-detail-label">URN</span>
              <span className="v2-detail-value">{first.school_urn_live || first.school_urn}</span>
            </div>
          ) : null}

          {yearRows.map((r) => {
            const lines = normalizeLineItems(r.line_items);
            const roundTitle =
              (r.round_label && String(r.round_label).trim()) ||
              ({
                march_national: "National offer (March)",
                realloc_april: "Re-allocation (spring)",
                realloc_may: "Second round (late spring)",
              }[r.round_code] ||
                r.round_code);
            return (
              <div key={`${r.entry_year}-${r.round_code}`} className="v2-allocation-round-block">
                <div className="v2-allocation-round-title">{roundTitle}</div>
                {r.profile_heading ? (
                  <p className="v2-muted v2-allocation-profile-heading">{r.profile_heading}</p>
                ) : null}
                {lines.length ? (
                  <ul className="v2-allocation-line-items">
                    {lines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="v2-muted">No criterion lines parsed for this round.</p>
                )}
                <div className="v2-detail-row v2-allocation-source-row">
                  <span className="v2-detail-label">Source file</span>
                  <span className="v2-detail-value">
                    {r.data_source_url ? (
                      <a className="v2-drawer-link" href={r.data_source_url} target="_blank" rel="noreferrer">
                        Open allocation spreadsheet →
                      </a>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
                {r.statistics_page_url ? (
                  <div className="v2-detail-row">
                    <span className="v2-detail-label">Statistics index</span>
                    <span className="v2-detail-value">
                      <a className="v2-drawer-link" href={r.statistics_page_url} target="_blank" rel="noreferrer">
                        School place allocation statistics (index) →
                      </a>
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </>
      ) : (
        <p className="v2-muted">No allocation profile rows for this entry year.</p>
      )}
    </div>
  );
}

/**
 * 11+ allocation: cohort year toggles + allocation snapshot (from admissions_policies).
 */
export default function AllocationPanel({ policies, allocationHistory, loading, error }) {
  const list = Array.isArray(policies) ? policies : [];
  const historyList = Array.isArray(allocationHistory) ? allocationHistory : [];

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

  if (!list.length && !historyList.length) {
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
        {policy && !showAlloc ? (
          <div className="v2-detail-section v2-catchment-block-first">
            <div className="v2-muted">
              Allocation snapshot is off for this year (enable show_stage_allocation in DB when ready).
            </div>
          </div>
        ) : null}

        {policy && showAlloc && allocRows.length ? (
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

        {policy && showAlloc && !allocRows.length ? (
          <div className="v2-detail-section v2-catchment-priority-block v2-catchment-block-first">
            <div className="v2-detail-section-title">Allocation snapshot</div>
            <div className="v2-muted">No snapshot in data yet.</div>
          </div>
        ) : null}

        <AllocationProfileHistory rows={historyList} />
      </div>
    </div>
  );
}
