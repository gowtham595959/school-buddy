// client/src/v2/components/drawer/SchoolDetailDrawer.jsx

import React, { useMemo, useState } from "react";
import { useCatchmentForDrawer } from "../../domains/catchmentV2/useCatchmentForDrawer";
import CatchmentPanel from "./CatchmentPanel";

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

function Section({ title, icon, children, defaultOpen = false, preview, onHeaderClick }) {
  const [open, setOpen] = useState(!!defaultOpen);

  const handleHeaderClick = () => {
    setOpen((v) => {
      const next = !v;
      if (onHeaderClick) onHeaderClick(next);
      return next;
    });
  };

  return (
    <div className="v2-drawer-section">
      <button
        type="button"
        className="v2-drawer-section-header"
        onClick={handleHeaderClick}
      >
        <div className="v2-drawer-section-header-left">
          {icon ? <span className="v2-drawer-section-icon">{icon}</span> : null}
          <span className="v2-drawer-section-title">{title}</span>
          {preview ? (
            <span className="v2-drawer-section-preview">{preview}</span>
          ) : null}
        </div>
        <span className="v2-drawer-section-chevron">{open ? "▾" : "▸"}</span>
      </button>

      {open ? <div className="v2-drawer-section-body">{children}</div> : null}
    </div>
  );
}

export default function SchoolDetailDrawer({ school, onClose, selectedIds = [], onShowCatchment }) {
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
      oxbridge: isEnabledFlag(school, "has_oxbridge"),
      inspection: isEnabledFlag(school, "has_inspection"),
      subjects: isEnabledFlag(school, "has_subjects"),
    };
  }, [school]);

  const { payload, loading, error } = useCatchmentForDrawer(
    school?.id,
    enabled.catchment
  );

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

      <div className="v2-drawer-scroll">
        {/* 1) School Details */}
        <Section
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
              <span className="v2-detail-label">Gender</span>
              <span className="v2-detail-value">{school.gender_type || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Age Range</span>
              <span className="v2-detail-value">{school.age_range || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Phase</span>
              <span className="v2-detail-value">{school.phase || "—"}</span>
            </div>
            <div className="v2-detail-row">
              <span className="v2-detail-label">Type</span>
              <span className="v2-detail-value">{school.school_type || "—"}</span>
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
            title="11+ Catchment"
            icon={DRAWER_ICONS.catchment}
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
          <Section title="11+ Exam Details" icon={DRAWER_ICONS.exam}>
            <div className="v2-muted">
              (MVP placeholder — next step: normalized tests → sessions → papers →
              subjects.)
            </div>
          </Section>
        ) : null}

        {/* 5) 11+ Allocation data */}
        {enabled.allocations ? (
          <Section title="11+ Allocation data" icon={DRAWER_ICONS.allocation}>
            <div className="v2-muted">
              (MVP placeholder — next step: annual allocation stats table.)
            </div>
          </Section>
        ) : null}

        {/* 6) GCSE results */}
        {enabled.gcse ? (
          <Section title="GCSE results" icon={DRAWER_ICONS.results}>
            <div className="v2-muted">
              (MVP placeholder — next step: show Progress 8 / Attainment 8 /
              Eng+Math metrics.)
            </div>
          </Section>
        ) : null}

        {/* 7) A level results */}
        {enabled.alevel ? (
          <Section title="A level results" icon={DRAWER_ICONS.results}>
            <div className="v2-muted">
              (MVP placeholder — next step: show avg grade/points + subject
              breakdowns.)
            </div>
          </Section>
        ) : null}

        {/* 8) Oxbridge offers & Destinations */}
        {enabled.oxbridge ? (
          <Section title="Oxbridge offers & Destinations" icon={DRAWER_ICONS.oxbridge}>
            <div className="v2-muted">
              (MVP placeholder — next step: yearly oxbridge + RG % + destinations.)
            </div>
          </Section>
        ) : null}

        {/* 9) Inspections */}
        {enabled.inspection ? (
          <Section title="Inspections" icon={DRAWER_ICONS.inspection}>
            <div className="v2-muted">
              (MVP placeholder — next step: Ofsted inspection history + deep ratings
              + link.)
            </div>
          </Section>
        ) : null}

        {/* 10) GCSE Subjects */}
        {enabled.subjects ? (
          <Section title="GCSE Subjects" icon={DRAWER_ICONS.subjects}>
            <div className="v2-muted">
              (MVP placeholder — next step: subjects list with exam boards +
              compulsory flag.)
            </div>
          </Section>
        ) : null}
      </div>
    </aside>
  );
}