import React from "react";
import { useMap } from "react-leaflet";

export default function LegendControl({ open, onToggle }) {
  useMap(); // ensures within MapContainer

  // Simple inline overlay (no Leaflet Control API yet)
  return (
    <div className="v2-legend">
      <button className="v2-key-btn" onClick={onToggle}>KEY</button>
      {open && (
        <div className="v2-legend-panel">
          <div><b>Merged</b>: thick outline</div>
          <div><b>Individuals</b>: faint polygons</div>
          <div><b>Priority</b>: P1 darkest → P3 lighter</div>
        </div>
      )}
    </div>
  );
}
