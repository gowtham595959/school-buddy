// client/src/v2/components/sidebar/SchoolRow.jsx

import React from "react";

export default function SchoolRow({
  school,
  checked,
  onToggle,
  onOpenTransport,
  hoverTitle, // ✅ additive
}) {
  return (
    <div className="v2-school-row">
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
        <button className="v2-icon-btn" title="Favourite">
          ♡
        </button>

        <button
          className="v2-icon-btn"
          title="Transport"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenTransport?.(school);
          }}
        >
          🚌
        </button>

        <button className="v2-icon-btn" title="More">
          ›
        </button>
      </div>
    </div>
  );
}
