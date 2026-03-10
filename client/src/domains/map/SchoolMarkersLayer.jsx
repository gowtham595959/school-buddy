import React from "react";
import MarkerLayer from "../../components/MarkerLayer";
import { prepareSchoolMarkers } from "./marker.service";

/**
 * SchoolMarkersLayer
 * ------------------
 * Render-only wrapper for school markers.
 *
 * Responsibilities:
 * - Prepare marker data via marker.service
 * - Delegate actual rendering to existing MarkerLayer
 *
 * IMPORTANT:
 * - No behaviour change
 * - No Leaflet logic here
 * - No filtering or styling
 */
export default function SchoolMarkersLayer({ schools }) {
  const markers = prepareSchoolMarkers(schools);

  // MarkerLayer currently expects full school objects,
  // so we pass through original schools for now
  return <MarkerLayer schools={schools} />;
}
