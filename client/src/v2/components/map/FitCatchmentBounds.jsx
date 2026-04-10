// client/src/v2/components/map/FitCatchmentBounds.jsx

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { filterDefinitionsToLatestYear } from "../../utils/catchmentYearUtils";

/** Keep map readable when a school has a very large catchment polygon (e.g. zoom-out extremes). Desktop only. */
const MIN_CATCHMENT_FIT_ZOOM = 11;

function radiusToMeters(radius, unit) {
  const r = Number(radius);
  if (!Number.isFinite(r) || r <= 0) return null;
  const u = String(unit || "").toLowerCase().trim();
  if (u === "km" || u === "kilometer" || u === "kilometre" || u === "kilometers" || u === "kilometres")
    return r * 1000;
  if (u === "m" || u === "meter" || u === "metre" || u === "meters" || u === "metres") return r;
  if (u === "mi" || u === "mile" || u === "miles") return r * 1609.344;
  return r * 1000;
}

export function getBoundsFromPayload(payload) {
  if (!payload?.school) return null;

  const school = payload.school;
  const schoolLat = school?.lat != null ? Number(school.lat) : null;
  const schoolLon = school?.lon != null ? Number(school.lon) : null;
  const schoolCenter =
    Number.isFinite(schoolLat) && Number.isFinite(schoolLon) ? [schoolLat, schoolLon] : null;

  const definitions = filterDefinitionsToLatestYear(payload.definitions || []);
  const geometriesByKey = payload.geometriesByKey || {};

  const allBounds = [];

  for (const def of definitions) {
    const geographyType = String(def.geography_type || "").toLowerCase();

    if (geographyType === "radius") {
      const meters = radiusToMeters(def.radius, def.radius_unit);
      if (schoolCenter && meters) {
        const [lat, lon] = schoolCenter;
        const circle = turf.circle([lon, lat], meters / 1000, { units: "kilometers" });
        const [minX, minY, maxX, maxY] = turf.bbox(circle);
        allBounds.push(L.latLngBounds([minY, minX], [maxY, maxX]));
      }
    } else {
      const bucket = geometriesByKey?.[def.catchment_key]?.geometries || [];
      for (const g of bucket) {
        const geojson = g?.geojson;
        if (!geojson) continue;
        try {
          const [minX, minY, maxX, maxY] = turf.bbox(geojson);
          allBounds.push(
            L.latLngBounds(
              [minY, minX],
              [maxY, maxX]
            )
          );
        } catch {
          // skip invalid geometry
        }
      }
    }
  }

  if (allBounds.length === 0) return null;
  if (allBounds.length === 1) return allBounds[0];
  return allBounds.reduce((acc, b) => acc.extend(b));
}

/**
 * Pans the map to fit the catchment area when a catchment checkbox is selected.
 * Only pans on select (add), not on deselect.
 *
 * Phone: PhoneMapViewportClamp patches getSize() so Leaflet frames within the visible strip.
 * No per-call padding hacks needed — simple symmetric padding works.
 */
export default function FitCatchmentBounds({ selectedIds, catchmentsBySchoolId }) {
  const map = useMap();
  const isPhone = useMediaQuery("(max-width: 767px)");
  const prevSelectedRef = useRef([]);
  const pendingPanRef = useRef(null);

  useEffect(() => {
    const selected = Array.isArray(selectedIds) ? selectedIds : [];
    const pending = pendingPanRef.current;
    if (pending != null && !selected.includes(pending)) {
      pendingPanRef.current = null;
    }

    const prev = prevSelectedRef.current;
    const newlyAdded = selected.filter((id) => !prev.includes(id));
    prevSelectedRef.current = selected;

    if (newlyAdded.length > 0) {
      pendingPanRef.current = newlyAdded[newlyAdded.length - 1];
    }
  }, [selectedIds]);

  useEffect(() => {
    const targetId = pendingPanRef.current;
    if (targetId == null) return;

    const selected = Array.isArray(selectedIds) ? selectedIds : [];
    if (!selected.includes(targetId)) {
      pendingPanRef.current = null;
      return;
    }

    const payload = catchmentsBySchoolId?.[targetId];
    if (payload == null) return;

    if (!payload.definitions?.length) {
      pendingPanRef.current = null;
      return;
    }

    const bounds = getBoundsFromPayload(payload);
    if (!bounds) {
      pendingPanRef.current = null;
      return;
    }

    pendingPanRef.current = null;

    const fitOpts = {
      padding: isPhone ? [20, 20] : [60, 60],
      animate: true,
      maxZoom: 16,
    };

    map.fitBounds(bounds, fitOpts);

    if (!isPhone) {
      const t = window.setTimeout(() => {
        const z = map.getZoom();
        if (z < MIN_CATCHMENT_FIT_ZOOM) {
          map.setZoom(MIN_CATCHMENT_FIT_ZOOM, { animate: true });
        }
      }, 500);
      return () => clearTimeout(t);
    }

    return undefined;
  }, [selectedIds, catchmentsBySchoolId, map, isPhone]);

  return null;
}
