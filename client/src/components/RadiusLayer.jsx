import React from "react";
import { Circle, Tooltip } from "react-leaflet";

/**
 * RadiusLayer
 *
 * Backward-compatible:
 * - accepts style props via spread
 * - defaults preserved
 */
export default function RadiusLayer({
  center,
  radius_km,
  label,
  color = "#2c3e50",
  opacity = 1,
  weight = 2,
}) {
  return (
    <Circle
      center={center}
      radius={radius_km * 1000}
      pathOptions={{
        color,
        opacity,
        weight,
        fillOpacity: 0,
      }}
    >
      {label && (
        <Tooltip direction="top" offset={[0, -5]} opacity={1} permanent>
          {label}
        </Tooltip>
      )}
    </Circle>
  );
}
