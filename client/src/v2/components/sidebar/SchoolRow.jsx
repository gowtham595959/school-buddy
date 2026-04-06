// client/src/v2/components/sidebar/SchoolRow.jsx

import React from "react";

export default function SchoolRow({
  school,
  checked,
  onToggle,
  onOpenTransport,
  hoverTitle, // ✅ additive
  onOpenDetails, // ✅ additive
  onRowClick, // ✅ additive: close drawer when clicking another school
  isDrawerOpen, // › button active
  isTransportOpen, // bus button active
  isCatchmentSelected, // checkbox on (catchment on map)
  /** True when this school is the map pan/ring focus (drawer, transport, or last row focus). */
  isMapFocused = false,
}) {
  const isCatchmentOnly =
    isCatchmentSelected && !isMapFocused;

  const rowClass = [
    "v2-school-row",
    isMapFocused ? "v2-school-row--focused" : "",
    isCatchmentOnly ? "v2-school-row--catchment-only" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={rowClass} onClick={() => onRowClick?.(school)}>
      <label className="v2-school-row-left">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(school.id)}
        />

        <span className="v2-school-name" title={hoverTitle || ""}>
          {school.name}
        </span>
      </label>

      <div className="v2-school-actions">
        <button
          type="button"
          className="v2-icon-btn"
          title="Favourite"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRowClick?.(school);
          }}
        >
          ♡
        </button>

        <button
          type="button"
          className={`v2-icon-btn${isTransportOpen ? " v2-icon-btn--active" : ""}`}
          title="Transport"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRowClick?.(school); /* Close drawer when clicking another school */
            onOpenTransport?.(school);
          }}
        >
          🚌
        </button>

        <button
          className={`v2-icon-btn${isDrawerOpen ? " v2-icon-btn--active" : ""}`}
          title="More"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenDetails?.(school);
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}