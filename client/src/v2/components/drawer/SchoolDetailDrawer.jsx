// client/src/v2/components/drawer/SchoolDetailDrawer.jsx

import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { useCatchmentForDrawer } from "../../domains/catchmentV2/useCatchmentForDrawer";
import { useAdmissionsPolicies } from "../../domains/admissions/useAdmissionsPolicies";
import { getOpenSeatsHeaderChipInfo } from "../../utils/catchmentOpenSeatsPreview";
import {
  pickLatestAdmissionPolicy,
  formatExamSubjectsChipFromPolicy,
} from "../../utils/examDetailsUtils";
import CatchmentPanel from "./CatchmentPanel";
import ExamDetailsPanel from "./ExamDetailsPanel";
import AllocationPanel from "./AllocationPanel";
import GcseResultsPanel from "./GcseResultsPanel";
import AlevelResultsPanel from "./AlevelResultsPanel";
import Destinations1618Panel from "./Destinations1618Panel";
import SubjectsPanel from "./SubjectsPanel";
import InspectionsPanel from "./InspectionsPanel";
import { useGcseResults } from "../../domains/gcse/useGcseResults";
import { useKs5Results } from "../../domains/ks5/useKs5Results";
import { useInspections } from "../../domains/inspections/useInspections";
import { useSchoolSubjects } from "../../domains/schoolSubjects/useSchoolSubjects";
import { getInspectionOverallChip } from "../../utils/inspectionGradeUtils";

const RESULTS_YEAR_TAB_ORDER = [2025, 2024, 2023];

function pickRowByYearTab(rows, order) {
  const byYear = new Map();
  for (const r of rows) {
    if (r.year_tab != null) byYear.set(Number(r.year_tab), r);
  }
  for (const y of order) {
    if (byYear.has(y)) return byYear.get(y);
  }
  return null;
}

/** GCSE grades 8–9 % chip: green from this %, yellow below. */
const GCSE_CHIP_GRADES_89_HIGH_PCT = 60;
/** GCSE grades 8–9 % chip: show ★ when strictly above this % (still green/yellow from high threshold above). */
const GCSE_CHIP_GRADES_89_STAR_PCT = 80;
/** A level % A* or A chip: green from this %, yellow below. */
const ALEVEL_CHIP_ASTAR_A_HIGH_PCT = 50;
/** A level % A* or A: show ★ outside the chip when strictly above this %. */
const ALEVEL_CHIP_ASTAR_A_STAR_PCT = 70;

function fmtResultsPctChip(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(1)}%`;
}

function resultsHeaderChipTier(rawPct, thresholdPct) {
  if (rawPct == null || rawPct === "") return null;
  const n = Number(rawPct);
  if (!Number.isFinite(n)) return null;
  return n >= thresholdPct ? "high" : "low";
}

function isEnabledFlag(school, flag) {
  // Core principle: if a flag is missing, behave as "enabled" (non-breaking).
  // Only hide a section when the flag exists AND is explicitly false.
  if (!school || !flag) return true;
  return school[flag] !== false;
}

// Monochrome SVG icons for drawer panels (Locrating-style)
const DRAWER_ICONS = {
  details: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  catchment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  exam: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  allocation: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  results: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  oxbridge: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  ),
  inspection: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  subjects: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
    </svg>
  ),
};

const EXAM_CHIP_FS_MAX = 12;
const EXAM_CHIP_FS_MIN = 8;

/** Single-line exam subjects chip: stays default size for short labels, scales down when needed. */
function ExamSubjectsHeaderChip({ label }) {
  const wrapRef = useRef(null);
  const chipRef = useRef(null);

  const fit = useCallback(() => {
    const wrap = wrapRef.current;
    const chip = chipRef.current;
    if (!wrap || !chip || !label) return;

    chip.style.fontSize = "";
    chip.style.padding = "";
    chip.style.paddingInline = "";
    chip.style.lineHeight = "";

    const avail = wrap.clientWidth;
    if (avail <= 1) return;

    let fs = EXAM_CHIP_FS_MAX;
    chip.style.fontSize = `${fs}px`;
    void chip.offsetHeight;

    while (fs > EXAM_CHIP_FS_MIN && chip.offsetWidth > avail) {
      fs -= 0.5;
      chip.style.fontSize = `${fs}px`;
      void chip.offsetHeight;
    }

    if (fs < EXAM_CHIP_FS_MAX) {
      const t = (EXAM_CHIP_FS_MAX - fs) / (EXAM_CHIP_FS_MAX - EXAM_CHIP_FS_MIN);
      const padY = Math.max(4, Math.round(5 - t * 1.5));
      chip.style.paddingBlock = `${padY}px`;
      chip.style.paddingInline = "12px";
      chip.style.lineHeight = "1.2";
    }
  }, [label]);

  useLayoutEffect(() => {
    fit();
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(fit);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fit]);

  return (
    <div className="v2-drawer-chip-exam-wrap" ref={wrapRef}>
      <span ref={chipRef} className="v2-drawer-chip v2-drawer-chip--exam-subjects">
        {label}
      </span>
    </div>
  );
}

/** Instant scroll only — `smooth` is unreliable inside iOS drawers / sheet stacks */
function scrollBlockIntoParent(container, blockEl, marginTopPx = 8) {
  if (!container || !blockEl || !blockEl.isConnected) return;
  const cRect = container.getBoundingClientRect();
  const bRect = blockEl.getBoundingClientRect();
  const nextTop = bRect.top - cRect.top + container.scrollTop - marginTopPx;
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
  container.scrollTop = Math.max(0, Math.min(nextTop, maxScroll));
}

/** Desktop: `.v2-drawer-sidebar` scrolls; phone: `.v2-drawer-scroll` inside the sheet scrolls (inner has overflow visible on desktop). */
function resolveDrawerScrollContainer(sectionEl, preferredRef) {
  const preferred = preferredRef?.current;
  const overflowYScrolls = (el) => {
    if (!el) return false;
    const oy = window.getComputedStyle(el).overflowY;
    return oy === "auto" || oy === "scroll" || oy === "overlay";
  };
  if (preferred && overflowYScrolls(preferred)) return preferred;
  const inner = sectionEl?.closest?.(".v2-drawer-scroll");
  if (inner && overflowYScrolls(inner)) return inner;
  const sidebar = sectionEl?.closest?.(".v2-drawer-sidebar");
  if (sidebar && overflowYScrolls(sidebar)) return sidebar;
  return preferred || inner || sidebar || null;
}

function Section({
  title,
  icon,
  children,
  defaultOpen = false,
  preview,
  previewClassName,
  onHeaderClick,
  /** Phone sheet: when a row expands, scroll it into view so bodies (e.g. tables) aren’t clipped */
  scrollIntoViewOnExpand = false,
  /** Scrollable `.v2-drawer-scroll` on phone — manual scroll is reliable when header is outside scroll */
  scrollParentRef,
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const rootRef = useRef(null);
  const bodyRef = useRef(null);
  const prevOpenRef = useRef(open);

  const handleHeaderClick = () => {
    setOpen((v) => {
      const next = !v;
      if (onHeaderClick) onHeaderClick(next);
      return next;
    });
  };

  useLayoutEffect(() => {
    if (!scrollIntoViewOnExpand) {
      prevOpenRef.current = open;
      return;
    }
    prevOpenRef.current = open;
    if (!open) return;

    const sectionEl = rootRef.current;
    if (!sectionEl?.isConnected) return;

    const alignSectionToTop = () => {
      const sec = rootRef.current;
      if (!sec?.isConnected) return;
      const c = resolveDrawerScrollContainer(sec, scrollParentRef);
      if (c) scrollBlockIntoParent(c, sec, 8);
      else sec.scrollIntoView({ block: "start", behavior: "auto", inline: "nearest" });
    };

    alignSectionToTop();
    let alive = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (alive) alignSectionToTop();
      });
    });

    const bodyEl = bodyRef.current;
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        alignSectionToTop();
      });
      ro.observe(sectionEl);
      if (bodyEl) ro.observe(bodyEl);
    }

    const delays = [50, 120, 280, 500, 900, 1400];
    const timers = delays.map((ms) => window.setTimeout(alignSectionToTop, ms));

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      ro?.disconnect();
    };
  }, [open, scrollIntoViewOnExpand, scrollParentRef, title]);

  return (
    <div ref={rootRef} className="v2-drawer-section">
      <div className="v2-drawer-section-header">
        <div className="v2-drawer-section-header-left">
          <button
            type="button"
            className="v2-drawer-section-header-trigger"
            onClick={handleHeaderClick}
          >
            {icon ? <span className="v2-drawer-section-icon">{icon}</span> : null}
            <span className="v2-drawer-section-title">{title}</span>
          </button>
          {preview ? (
            <span
              className={["v2-drawer-section-preview", previewClassName].filter(Boolean).join(" ")}
            >
              {preview}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="v2-drawer-section-header-chevron"
          onClick={handleHeaderClick}
          aria-label={open ? "Collapse section" : "Expand section"}
        >
          <span className="v2-drawer-section-chevron-icon">{open ? "▾" : "▸"}</span>
        </button>
      </div>

      {open ? (
        <div ref={bodyRef} className="v2-drawer-section-body">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default function SchoolDetailDrawer({
  school,
  onClose,
  selectedIds = [],
  onShowCatchment,
  /** Phone bottom sheet: scroll detail body to top when opening / switching school */
  scrollToTopOnSchoolChange = false,
}) {
  const drawerScrollRef = useRef(null);

  useLayoutEffect(() => {
    if (school?.id == null) return;
    const inner = drawerScrollRef.current;
    const sidebar = inner?.closest?.(".v2-drawer-sidebar");
    const go = () => {
      if (scrollToTopOnSchoolChange && inner) inner.scrollTop = 0;
      if (sidebar && sidebar !== inner) {
        const oy = window.getComputedStyle(sidebar).overflowY;
        if (oy === "auto" || oy === "scroll" || oy === "overlay") sidebar.scrollTop = 0;
      }
    };
    go();
    requestAnimationFrame(go);
  }, [scrollToTopOnSchoolChange, school?.id]);
  const enabled = useMemo(() => {
    const admissionsOk = isEnabledFlag(school, "has_admissions");
    const hasCatchment = isEnabledFlag(school, "has_catchment");
    const isOpenCatchment = (school?.catchment_category || "").toLowerCase() === "open";
    return {
      catchment: (admissionsOk && hasCatchment) || isOpenCatchment,
      exams: admissionsOk && isEnabledFlag(school, "has_exams"),
      allocations: admissionsOk && isEnabledFlag(school, "has_allocations"),
      gcse: isEnabledFlag(school, "has_results_gcse"),
      alevel: isEnabledFlag(school, "has_results_alevel"),
      destinations:
        Boolean(school?.has_results_destinations) ||
        school?.oxbridge_offers != null ||
        Boolean(school?.source_url_oxbridge_offers),
      inspection: isEnabledFlag(school, "has_inspection"),
      subjects: isEnabledFlag(school, "has_subjects"),
    };
  }, [school]);

  const { payload, loading, error } = useCatchmentForDrawer(
    school?.id,
    enabled.catchment
  );

  const admissionsPoliciesEnabled = enabled.exams || enabled.allocations;
  const {
    policies: admissionsPolicies,
    allocationHistory: admissionsAllocationHistory,
    loading: admissionsLoading,
    error: admissionsError,
  } = useAdmissionsPolicies(school?.id, admissionsPoliciesEnabled);

  const catchmentOpenSeatsChip = useMemo(() => {
    if (!enabled.catchment || loading || error || !payload) return null;
    return getOpenSeatsHeaderChipInfo(payload, school);
  }, [enabled.catchment, loading, error, payload, school]);

  const examHeaderPreview = useMemo(() => {
    if (!enabled.exams || admissionsLoading || admissionsError) return null;
    const policy = pickLatestAdmissionPolicy(admissionsPolicies);
    const subjectsLabel = formatExamSubjectsChipFromPolicy(policy);
    if (!subjectsLabel) return null;
    return <ExamSubjectsHeaderChip label={subjectsLabel} />;
  }, [enabled.exams, admissionsLoading, admissionsError, admissionsPolicies]);

  const { rows: gcseRows, loading: gcseLoading, error: gcseError } = useGcseResults(
    school?.id,
    enabled.gcse && Boolean(school?.id)
  );

  const gcseHeaderPreview = useMemo(() => {
    if (!enabled.gcse || gcseLoading || gcseError || gcseRows.length === 0) return null;
    const row = pickRowByYearTab(gcseRows, RESULTS_YEAR_TAB_ORDER);
    if (!row) return null;
    const pct = fmtResultsPctChip(row.gcse_entries_pct_grade_8_9);
    if (!pct) return null;
    const tier = resultsHeaderChipTier(row.gcse_entries_pct_grade_8_9, GCSE_CHIP_GRADES_89_HIGH_PCT);
    const tierClass =
      tier === "high"
        ? "v2-drawer-chip--results-header-high"
        : tier === "low"
          ? "v2-drawer-chip--results-header-low"
          : "";
    const gcse89n = Number(row.gcse_entries_pct_grade_8_9);
    const showGcseOutstandingStar =
      Number.isFinite(gcse89n) && gcse89n > GCSE_CHIP_GRADES_89_STAR_PCT;
    const gcseChipTitle = `Latest loaded year — grades 8 or 9 share of counted GCSE entries (DfE). Chip is green at ≥${GCSE_CHIP_GRADES_89_HIGH_PCT}%, yellow below.${
      showGcseOutstandingStar
        ? ` ★ Shown when grades 8 or 9 are above ${GCSE_CHIP_GRADES_89_STAR_PCT}%.`
        : ""
    }`;
    return (
      <span
        className={["v2-drawer-chip", tierClass].filter(Boolean).join(" ")}
        title={gcseChipTitle}
      >
        Grades 8 or 9 : {pct}
        {showGcseOutstandingStar ? (
          <span className="v2-drawer-chip__results-outstanding-star" aria-hidden>
            ★
          </span>
        ) : null}
      </span>
    );
  }, [enabled.gcse, gcseLoading, gcseError, gcseRows]);

  const { rows: ks5Rows, loading: ks5Loading, error: ks5Error } = useKs5Results(
    school?.id,
    enabled.alevel && Boolean(school?.id)
  );

  const { rows: inspectionRows, loading: inspectionLoading, error: inspectionError } = useInspections(
    school?.id,
    enabled.inspection && Boolean(school?.id)
  );

  const inspectionHeaderPreview = useMemo(() => {
    if (!enabled.inspection || inspectionLoading || inspectionError || !inspectionRows?.length) return null;
    const latest = inspectionRows[0];
    const chip = getInspectionOverallChip(latest?.overall_grade);
    return (
      <span
        className={`v2-drawer-chip v2-drawer-chip--single-line v2-inspection-grade-chip v2-inspection-grade-chip--${chip.tier}`}
        title="Latest published overall effectiveness (England — see Inspections panel for date and links)."
      >
        {chip.label}
      </span>
    );
  }, [enabled.inspection, inspectionLoading, inspectionError, inspectionRows]);

  const alevelHeaderPreview = useMemo(() => {
    if (!enabled.alevel || ks5Loading || ks5Error || ks5Rows.length === 0) return null;
    const row = pickRowByYearTab(ks5Rows, RESULTS_YEAR_TAB_ORDER);
    if (!row) return null;
    const pct = fmtResultsPctChip(row.alevel_entries_pct_grade_astar_a);
    if (!pct) return null;
    const tier = resultsHeaderChipTier(row.alevel_entries_pct_grade_astar_a, ALEVEL_CHIP_ASTAR_A_HIGH_PCT);
    const tierClass =
      tier === "high"
        ? "v2-drawer-chip--results-header-high"
        : tier === "low"
          ? "v2-drawer-chip--results-header-low"
          : "";
    const astarAn = Number(row.alevel_entries_pct_grade_astar_a);
    const showAlevelOutstandingStar =
      Number.isFinite(astarAn) && astarAn > ALEVEL_CHIP_ASTAR_A_STAR_PCT;
    const alevelChipTitle = `Latest loaded year — % of GCE A level exam entries at A* or A (DfE). Chip is green at ≥${ALEVEL_CHIP_ASTAR_A_HIGH_PCT}%, yellow below.${
      showAlevelOutstandingStar
        ? ` ★ Shown when A* or A share is above ${ALEVEL_CHIP_ASTAR_A_STAR_PCT}%.`
        : ""
    }`;
    return (
      <span
        className={["v2-drawer-chip", tierClass].filter(Boolean).join(" ")}
        title={alevelChipTitle}
      >
        A* or A : {pct}
        {showAlevelOutstandingStar ? (
          <span className="v2-drawer-chip__results-outstanding-star" aria-hidden>
            ★
          </span>
        ) : null}
      </span>
    );
  }, [enabled.alevel, ks5Loading, ks5Error, ks5Rows]);

  const { rows: subjectRows, loading: subjectsLoading, error: subjectsError } = useSchoolSubjects(
    school?.id,
    enabled.subjects && Boolean(school?.id)
  );

  const subjectsHeaderPreview = useMemo(() => {
    if (!enabled.subjects) return null;
    if (subjectsLoading || subjectsError) return null;
    const list = Array.isArray(subjectRows) ? subjectRows : [];
    const gcseCount = list.filter((r) => r.level !== "alevel").length;
    const alevelCount = list.filter((r) => r.level === "alevel").length;
    return (
      <>
        <span
          className="v2-drawer-chip v2-drawer-chip--single-line"
          title="Count of Key Stage 4 subject lines in DfE data (performance-table qualifications)."
        >
          GCSE : {gcseCount}
        </span>
        <span
          className="v2-drawer-chip v2-drawer-chip--single-line"
          title="Count of post-16 subject lines in DfE data (e.g. GCE A level and equivalent)."
        >
          A-Levels : {alevelCount}
        </span>
      </>
    );
  }, [enabled.subjects, subjectsLoading, subjectsError, subjectRows]);

  const destinationsHeaderPreview = useMemo(() => {
    if (!enabled.destinations || !school) return null;
    const hasSchoolOx =
      school.oxbridge_offers != null ||
      (school.source_url_oxbridge_offers != null &&
        String(school.source_url_oxbridge_offers).trim() !== "");
    if (!hasSchoolOx) return null;
    const n =
      school.oxbridge_offers != null && school.oxbridge_offers !== ""
        ? String(school.oxbridge_offers)
        : "—";
    return (
      <span
        className="v2-drawer-chip v2-drawer-chip--open-seats-neutral v2-drawer-chip--single-line"
        title="School-reported Oxbridge offers (see panel for full label, source link, and DfE destinations)."
      >
        Oxbridge : {n}
      </span>
    );
  }, [enabled.destinations, school]);

  const sectionScrollProps = { scrollIntoViewOnExpand: true, scrollParentRef: drawerScrollRef };

  return (
    <aside className="v2-right-drawer" aria-label="School details drawer">
      <div className="v2-drawer-header">
        <div className="v2-drawer-title-wrap">
          <div className="v2-drawer-title">
            {school.display_name || school.name}
          </div>
          {school.local_authority ? (
            <div className="v2-drawer-subtitle">{school.local_authority}</div>
          ) : null}
        </div>

        <button
          type="button"
          className="v2-icon-btn"
          title="Close"
          onClick={() => onClose?.()}
        >
          ✕
        </button>
      </div>

      <div ref={drawerScrollRef} className="v2-drawer-scroll">
        {/* 1) School Details */}
        <Section
          {...sectionScrollProps}
          title="School Details"
          icon={DRAWER_ICONS.details}
          preview={
            (school.gender_type || school.school_type) ? (
              <>
                {school.gender_type && (
                  <span
                    className={`v2-drawer-chip v2-drawer-chip--gender v2-drawer-chip--${(
                      school.gender_type || ""
                    ).toLowerCase()}`}
                  >
                    {school.gender_type}
                  </span>
                )}
                {school.school_type && (
                  <span className="v2-drawer-chip">{school.school_type}</span>
                )}
              </>
            ) : null
          }
        >
          <div className="v2-school-details">
            <div className="v2-detail-row">
              <span className="v2-detail-label">Age Range</span>
              <span className="v2-detail-value">{school.age_range || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Phase</span>
              <span className="v2-detail-value">{school.phase || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Website</span>
              <span className="v2-detail-value">
                {school.website ? (
                  <a
                    className="v2-drawer-link"
                    href={school.website.startsWith("http") ? school.website : `https://${school.website}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {school.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Local Authority</span>
              <span className="v2-detail-value">{school.local_authority || school.council_name || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Day / Boarding</span>
              <span className="v2-detail-value">{school.boarding_type || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Selective</span>
              <span className="v2-detail-value">{school.selectivity_type || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">URN</span>
              <span className="v2-detail-value">{school.school_code || "—"}</span>
            </div>
            {school.school_code ? (
              <div className="v2-detail-row" style={{ marginTop: 4 }}>
                <span className="v2-detail-label">Gov.uk</span>
                <a
                  className="v2-drawer-link"
                  href={`https://get-information-schools.service.gov.uk/Establishments/Establishment/Details/${school.school_code}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Gov.uk →
                </a>
              </div>
            ) : null}
            <div className="v2-detail-row">
              <span className="v2-detail-label">Religious Affiliation</span>
              <span className="v2-detail-value">{school.religious_affiliation || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Fees</span>
              <span className="v2-detail-value">{school.fees || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Address</span>
              <span className="v2-detail-value">{school.address || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Phone</span>
              <span className="v2-detail-value">
                {school.phone ? (
                  <a className="v2-drawer-link" href={`tel:${school.phone}`}>
                    {school.phone}
                  </a>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>
        </Section>

        {/* 3) 11+ Catchment */}
        {enabled.catchment ? (
          <Section
            {...sectionScrollProps}
            title="11+ Catchment"
            icon={DRAWER_ICONS.catchment}
            preview={
              catchmentOpenSeatsChip ? (
                <span
                  className={`v2-drawer-chip v2-drawer-chip--open-seats v2-drawer-chip--open-seats-${catchmentOpenSeatsChip.tier}`}
                >
                  {catchmentOpenSeatsChip.label}
                </span>
              ) : null
            }
            onHeaderClick={(isOpen) => {
              const id = school?.id;
              if (!id || !onShowCatchment) return;
              const selected = selectedIds.includes(id);
              if (isOpen && !selected) onShowCatchment(id);
              if (!isOpen && selected) onShowCatchment(id);
            }}
          >
            <CatchmentPanel
              payload={payload}
              school={school}
              loading={loading}
              error={error}
              selectedIds={selectedIds}
              onShowCatchment={onShowCatchment}
            />
          </Section>
        ) : null}

        {/* 4) 11+ Exam Details */}
        {enabled.exams ? (
          <Section
            {...sectionScrollProps}
            title="11+ Exam Details"
            icon={DRAWER_ICONS.exam}
            preview={examHeaderPreview}
            previewClassName="v2-drawer-section-preview--exam-fit"
          >
            <ExamDetailsPanel
              policies={admissionsPolicies}
              loading={admissionsLoading}
              error={admissionsError}
            />
          </Section>
        ) : null}

        {/* 5) 11+ Allocation details */}
        {enabled.allocations ? (
          <Section {...sectionScrollProps} title="11+ Allocation details" icon={DRAWER_ICONS.allocation}>
            <AllocationPanel
              policies={admissionsPolicies}
              allocationHistory={admissionsAllocationHistory}
              loading={admissionsLoading}
              error={admissionsError}
            />
          </Section>
        ) : null}

        {/* 6) GCSE results */}
        {enabled.gcse ? (
          <Section {...sectionScrollProps} title="GCSE results" icon={DRAWER_ICONS.results} preview={gcseHeaderPreview}>
            <GcseResultsPanel schoolId={school?.id} />
          </Section>
        ) : null}

        {/* 7) A level results */}
        {enabled.alevel ? (
          <Section {...sectionScrollProps} title="A level results" icon={DRAWER_ICONS.results} preview={alevelHeaderPreview}>
            <AlevelResultsPanel schoolId={school?.id} />
          </Section>
        ) : null}

        {/* 8) Post-18 destinations (DfE) — panel title kept for parents searching “Oxbridge” */}
        {enabled.destinations ? (
          <Section
            {...sectionScrollProps}
            title="Oxbridge offers & Destinations"
            icon={DRAWER_ICONS.oxbridge}
            preview={destinationsHeaderPreview}
            previewClassName="v2-drawer-section-preview--nowrap"
          >
            <Destinations1618Panel schoolId={school?.id} school={school} />
          </Section>
        ) : null}

        {/* 9) Inspections */}
        {enabled.inspection ? (
          <Section
            {...sectionScrollProps}
            title="Inspections"
            icon={DRAWER_ICONS.inspection}
            preview={inspectionHeaderPreview}
            previewClassName="v2-drawer-section-preview--nowrap"
          >
            <InspectionsPanel schoolId={school?.id} enabled={enabled.inspection} />
          </Section>
        ) : null}

        {/* 10) Subjects (KS4 + post-16 entries) */}
        {enabled.subjects ? (
          <Section
            {...sectionScrollProps}
            title="Subjects"
            icon={DRAWER_ICONS.subjects}
            preview={subjectsHeaderPreview}
            previewClassName="v2-drawer-section-preview--subjects-chips"
          >
            <SubjectsPanel schoolId={school?.id} enabled={enabled.subjects} />
          </Section>
        ) : null}
      </div>
    </aside>
  );
}