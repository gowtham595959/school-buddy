import React from "react";
import CatchmentLayer from "../../components/CatchmentLayer";
import RadiusLayer from "../../components/RadiusLayer";

import {
  toLeafletPolygonStyle,
  toRadiusStyle,
  pickStyle,
} from "./catchment.styles";

/**
 * CatchmentMapLayer (Domain)
 *
 * Responsible for rendering ALL catchment geometry
 * using DB-driven styles with safe fallbacks.
 *
 * VISUAL GUARANTEE:
 * - If no DB style exists → visuals remain unchanged
 */
export default function CatchmentMapLayer({
  data,
  schoolId,
  schoolName,
  routeActive,
  defaultRadiusColor,
}) {
  if (!data) return null;

  const { polygons, individual_polygons, styles } = data;

  // ---- FALLBACK STYLES (match current visuals exactly) ----
  const fallbackOuterStyle = {
    color: "#2563eb",
    weight: 2,
    opacity: 1,
    fillColor: "#2563eb",
    fillOpacity: 0.15,
  };

  const fallbackIndividualStyle = {
    color: "#1d4ed8",
    weight: 2,
    opacity: 1,
    fillColor: "#1d4ed8",
    fillOpacity: 0.25,
  };

  const fallbackRadiusStyle = {
    color: defaultRadiusColor,
    opacity: routeActive ? 0.25 : 1,
    weight: 2,
  };

  // ---- RESOLVED STYLES (DB → Leaflet, fallback-safe) ----
  const outerStyle = toLeafletPolygonStyle(
    pickStyle(styles, "outer"),
    fallbackOuterStyle
  );

  const individualStyle = toLeafletPolygonStyle(
    pickStyle(styles, "individual"),
    fallbackIndividualStyle
  );

  const radiusStyle = toRadiusStyle(
    pickStyle(styles, "radius"),
    fallbackRadiusStyle
  );

  return (
    <>
      {polygons?.length > 0 && (
        <CatchmentLayer
          polygons={polygons}
          style={outerStyle}
        />
      )}

      {individual_polygons?.length > 0 && (
        <CatchmentLayer
          polygons={individual_polygons}
          style={individualStyle}
        />
      )}

      {data.show_radius &&
        data.radius_km &&
        data.lat &&
        data.lon && (
          <RadiusLayer
            center={[data.lat, data.lon]}
            radius_km={data.radius_km}
            label={schoolName}
            {...radiusStyle}
          />
        )}
    </>
  );
}
