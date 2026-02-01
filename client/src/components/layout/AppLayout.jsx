import React from "react";

/**
 * AppLayout
 * ----------
 * Pure layout component.
 *
 * Responsibilities:
 * - Page-level flex layout
 * - Sidebar vs Map split
 *
 * IMPORTANT:
 * - No domain logic
 * - No Leaflet imports
 * - No state
 */
export default function AppLayout({ sidebar, map }) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 280,
          padding: 20,
          borderRight: "1px solid #ccc",
          overflowY: "auto",
        }}
      >
        {sidebar}
      </div>

      {/* Map */}
      <div style={{ flex: 1 }}>
        {map}
      </div>
    </div>
  );
}
