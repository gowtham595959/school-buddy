// client/src/v2/components/drawer/CatchmentPanel.jsx

import React, { useMemo, useState } from "react";

/** Geography types that have no members list (radius = circle, open = no fixed boundary). */
const GEOGRAPHY_TYPES_WITHOUT_MEMBERS = ["radius", "open"];

function toTitleCase(str) {
  if (!str || str === "—") return str;
  return str
    .split(/\s+|_/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Parent-friendly labels for catchment category (from schools.catchment_category). */
const CATCHMENT_CATEGORY_DISPLAY = {
  "designated catchment": "Priority area",
  open: "Open to applicants from anywhere",
  both: "Priority area and open catchment",
};

function formatCatchmentCategory(raw) {
  if (!raw || !String(raw).trim()) return "—";
  const key = String(raw).trim().toLowerCase();
  return CATCHMENT_CATEGORY_DISPLAY[key] ?? toTitleCase(raw);
}

/** Use DB display column, fallback to technical column (title-cased) when null. */
function formatDisplay(display, technical) {
  if (display && String(display).trim()) return String(display).trim();
  if (technical && String(technical).trim()) return toTitleCase(technical);
  return "—";
}

/** Catchment boundary: use DB display, or for radius show "X unit" when display is null. */
function formatBoundaryDisplay(def) {
  if (def?.catchment_boundary_display?.trim()) return def.catchment_boundary_display.trim();
  const gt = String(def?.geography_type || "").toLowerCase();
  if (gt === "radius") {
    const r = def?.radius ?? "—";
    const u = (def?.radius_unit || "").trim();
    return `${r}${u ? " " + u : ""}`.trim();
  }
  return formatDisplay(null, def?.geography_type);
}

/**
 * Renders the 11+ Catchment section with year toggles and per-priority definitions.
 * Uses existing v2-detail-row styling for consistency.
 */
export default function CatchmentPanel({ payload, school, loading, error, selectedIds = [], onShowCatchment }) {
  const years = useMemo(() => {
    const defs = payload?.definitions ?? [];
    const policies = payload?.admissionsPolicies ?? [];
    const fromDefs = defs.map((d) => d.catchment_year).filter(Boolean);
    const fromPolicies = policies.map((p) => p.entry_year).filter(Boolean);
    const set = new Set([...fromDefs, ...fromPolicies]);
    return Array.from(set).sort((a, b) => (b || 0) - (a || 0));
  }, [payload?.definitions, payload?.admissionsPolicies]);

  const [selectedYear, setSelectedYear] = useState(null);

  // Default to most recent year when years change
  const effectiveYear = useMemo(() => {
    if (selectedYear && years.includes(selectedYear)) return selectedYear;
    return years[0] ?? null;
  }, [years, selectedYear]);

  const policyForYear = useMemo(() => {
    const policies = payload?.admissionsPolicies ?? [];
    return policies.find((p) => p.entry_year === effectiveYear) ?? null;
  }, [payload?.admissionsPolicies, effectiveYear]);

  const definitionsForYear = useMemo(() => {
    const defs = payload?.definitions ?? [];
    const forYear = defs.filter((d) => d.catchment_year === effectiveYear);
    if (forYear.length > 0) {
      return forYear.sort((a, b) => (a.catchment_priority ?? 99) - (b.catchment_priority ?? 99));
    }
    const fallbackYear = defs
      .map((d) => d.catchment_year)
      .filter((y) => y != null)
      .sort((a, b) => (b || 0) - (a || 0))[0];
    if (fallbackYear == null) return [];
    return defs
      .filter((d) => d.catchment_year === fallbackYear)
      .sort((a, b) => (a.catchment_priority ?? 99) - (b.catchment_priority ?? 99));
  }, [payload?.definitions, effectiveYear]);

  const schoolFromPayload = payload?.school ?? school;
  const catchmentCategory = schoolFromPayload?.catchment_category;
  const schoolId = school?.id ?? schoolFromPayload?.id;

  /** Same as expand: add catchment if not selected. Only section collapse removes. */
  const handlePanelClick = (e) => {
    if (!onShowCatchment || !schoolId) return;
    if (e.target.closest("a")) return;
    if (!selectedIds.includes(schoolId)) onShowCatchment(schoolId);
  };

  const canShowCatchment = !!onShowCatchment && !!schoolId && payload?.definitions?.length > 0;

  if (loading) {
    return (
      <div className="v2-catchment-panel">
        <div className="v2-muted">Loading catchment data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="v2-catchment-panel">
        <div className="v2-muted" style={{ color: "#c00" }}>{error}</div>
      </div>
    );
  }

  const hasDefinitions = payload?.definitions?.length > 0;
  const hasPolicies = payload?.admissionsPolicies?.length > 0;

  if (!payload || (!hasDefinitions && !hasPolicies)) {
    const cat = schoolFromPayload?.catchment_category;
    const isOpen = (cat || "").toLowerCase() === "open";
    return (
      <div className="v2-catchment-panel">
        <div className="v2-detail-section v2-catchment-block-first">
          <div className="v2-detail-row">
            <span className="v2-detail-label">Catchment</span>
            <span className="v2-detail-value">{isOpen ? formatCatchmentCategory(cat) : "—"}</span>
          </div>
          {!isOpen ? (
            <div className="v2-muted" style={{ marginTop: 4 }}>No catchment definitions available for this school.</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="v2-catchment-panel"
      onClick={canShowCatchment ? handlePanelClick : undefined}
      onKeyDown={canShowCatchment ? (e) => e.key === "Enter" && handlePanelClick(e) : undefined}
      role={canShowCatchment ? "button" : undefined}
      tabIndex={canShowCatchment ? 0 : undefined}
      title={canShowCatchment ? "Click to show or hide catchment on map" : undefined}
      style={canShowCatchment ? { cursor: "pointer" } : undefined}
    >
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
        {(policyForYear || hasDefinitions) ? (
          <div className="v2-detail-section v2-catchment-block-first">
            {policyForYear ? (
              <>
                <div className="v2-detail-row" style={{ marginBottom: 4 }}>
                  <span className="v2-detail-label">Total 11+ Seats</span>
                  <span className="v2-detail-value">{policyForYear.total_intake ?? "—"}</span>
                </div>
                <div className="v2-detail-row" style={{ marginBottom: 4 }}>
                  <span className="v2-detail-label">Admission Policy</span>
                  <span className="v2-detail-value">
                    {policyForYear.policy_url ? (
                      <a
                        className="v2-drawer-link"
                        href={policyForYear.policy_url.startsWith("http") ? policyForYear.policy_url : `https://${policyForYear.policy_url}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View admission policy →
                      </a>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
                {!hasDefinitions && (catchmentCategory || "").toLowerCase() === "open" ? (
                  <div className="v2-detail-row" style={{ marginBottom: 4, marginTop: 4 }}>
                    <span className="v2-detail-label">Catchment</span>
                    <span className="v2-detail-value">{formatCatchmentCategory(catchmentCategory)}</span>
                  </div>
                ) : null}
              </>
            ) : null}
            {hasDefinitions && definitionsForYear.length > 0 ? (
              <div className="v2-detail-row" style={{ marginBottom: 4 }}>
                <span className="v2-detail-label">Catchment</span>
                <span className="v2-detail-value">{formatCatchmentCategory(catchmentCategory)}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {definitionsForYear.map((def, idx) => (
          <DefinitionBlock
            key={`${def.catchment_key}-${def.catchment_priority}-${idx}`}
            def={def}
            catchmentCategory={catchmentCategory}
            isFirst={idx === 0}
            hideCatchmentCategory={!!(policyForYear || hasDefinitions)}
            hasPolicyBlockAbove={!!(policyForYear || (hasDefinitions && definitionsForYear.length > 0))}
          />
        ))}
      </div>
    </div>
  );
}

function DefinitionBlock({ def, catchmentCategory, isFirst, hideCatchmentCategory, hasPolicyBlockAbove }) {
  const typeDisplay = formatDisplay(def.catchment_type_display, def.catchment_key);
  const boundaryDisplay = formatBoundaryDisplay(def);

  const members = Array.isArray(def.members_display) ? def.members_display : [];
  const membersText = members
    .map((m) => (m && typeof m === "object" ? (m.name || m.code || "") : String(m)))
    .filter(Boolean)
    .join(", ") || "—";

  const blockClass = isFirst && !hasPolicyBlockAbove ? "v2-catchment-block-first" : "v2-catchment-priority-block";

  return (
    <div className={`v2-detail-section ${blockClass}`}>
      {isFirst && catchmentCategory && !hideCatchmentCategory ? (
        <div className="v2-detail-row" style={{ marginBottom: 4 }}>
          <span className="v2-detail-label">Catchment</span>
          <span className="v2-detail-value">{formatCatchmentCategory(catchmentCategory)}</span>
        </div>
      ) : null}
      <div className="v2-detail-row">
        <span className="v2-detail-label">Catchment Type</span>
        <span className="v2-detail-value">{typeDisplay}</span>
      </div>
      <div className="v2-detail-row">
        <span className="v2-detail-label">Catchment Boundary</span>
        <span className="v2-detail-value">{boundaryDisplay}</span>
      </div>
      <div className="v2-detail-row">
        <span className="v2-detail-label">Ranking method</span>
        <span className="v2-detail-value">{def.admission_priority ?? "—"}</span>
      </div>
      {!GEOGRAPHY_TYPES_WITHOUT_MEMBERS.includes(String(def.geography_type || "").toLowerCase()) ? (
        <div className="v2-detail-row">
          <span className="v2-detail-label">Members</span>
          <span className="v2-detail-value">{membersText}</span>
        </div>
      ) : null}
      <div className="v2-detail-row">
        <span className="v2-detail-label">Seats Allocated</span>
        <span className="v2-detail-value">
          {def.catchment_alloc_seats_display?.trim() ?? (def.catchment_alloc_seats != null ? def.catchment_alloc_seats : "—")}
        </span>
      </div>
    </div>
  );
}
