import React from "react";
import { Polygon, Marker } from "react-leaflet";
import L from "leaflet";

export default function CatchmentLayer({ polygons }) {
  if (!polygons || polygons.length === 0) return null;

  const toLatLngRings = (geometry) => {
    if (!geometry || !geometry.coordinates) return [];

    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.map((poly) =>
        poly[0].map(([lng, lat]) => [lat, lng])
      );
    }

    if (geometry.type === "Polygon") {
      return [geometry.coordinates[0].map(([lng, lat]) => [lat, lng])];
    }

    return [];
  };

  const styleForType = (type) => {
    if (type === "outer") {
      return { color: "#0044cc", weight: 2.5, fillOpacity: 0.1 };
    }
    if (type === "inner") {
      return { color: "green", weight: 1.5, fillOpacity: 0.04 };
    }
    if (type === "individual") {
      return { color: "#666", weight: 0.8, fillOpacity: 0.02 };
    }
    return { color: "#999", weight: 1, fillOpacity: 0.05 };
  };

  const labelIcon = (text) =>
    new L.DivIcon({
      className: "postcode-label",
      html: `<div style="
        font-size:11px;
        color:#444;
        opacity:0.6;
        font-weight:500;
        pointer-events:none;
      ">${text}</div>`,
    });

  return (
    <>
      {polygons.map((p) => {
        const rings = toLatLngRings(p.geometry);
        if (!rings.length) return null;

        return (
          <React.Fragment key={p.id}>
            {/* Draw polygon(s) */}
            {rings.map((ring, idx) => (
              <Polygon
                key={`${p.id}-poly-${idx}`}
                positions={ring}
                pathOptions={styleForType(p.type)}
              />
            ))}

            {/* 🔹 Label for individual postcode polygons */}
            {p.type === "individual" && (
              <Marker
                key={`${p.id}-label`}
                position={L.polygon(rings[0]).getBounds().getCenter()}
                icon={labelIcon(p.id)}
                interactive={false}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
