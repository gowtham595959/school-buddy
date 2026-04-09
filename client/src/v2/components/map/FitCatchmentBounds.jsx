// client/src/v2/components/map/FitCatchmentBounds.jsx

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { filterDefinitionsToLatestYear } from "../../utils/catchmentYearUtils";

/** Keep map readable when a school has a very large catchment polygon (e.g. zoom-out extremes). Desktop only. */
const MIN_CATCHMENT_FIT_ZOOM = 11;

/** Bottom inset for Leaflet fitBounds on phone — must clear bottom school cards (see --v2-mobile-deck-clearance). */
function mobileFitBoundsBottomPaddingPx() {
  if (typeof window === "undefined") return 280;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--v2-mobile-deck-clearance")
    .trim();
  const n = parseFloat(raw);
  const deck = Number.isFinite(n) ? n : 240;
  return Math.round(deck + 32);
}

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

    const fitOpts = isPhone
      ? {
          /* Reserve space for top bar + bottom card deck so catchments stay in the visible map strip */
          paddingTopLeft: [16, 68],
          paddingBottomRight: [16, mobileFitBoundsBottomPaddingPx()],
          animate: true,
          maxZoom: 16,
        }
      : {
          paddingTopLeft: [60, 60],
          paddingBottomRight: [60, 60],
          animate: true,
          maxZoom: 16,
        };

    map.fitBounds(bounds, fitOpts);

    /* Desktop: floor zoom for huge polygons. */
    if (!isPhone) {
      const t = window.setTimeout(() => {
        const z = map.getZoom();
        if (z < MIN_CATCHMENT_FIT_ZOOM) {
          map.setZoom(MIN_CATCHMENT_FIT_ZOOM, { animate: true });
        }
      }, 500);
      return () => clearTimeout(t);
    }

    /*
     * Mobile (esp. iOS Safari): first fitBounds often uses a stale map size before the URL bar /
     * visual viewport settles, so zoom can sit one level too low vs Chrome-on-iOS. Re-fit after layout
     * and on visualViewport resize (same padding for all schools — no per-school table).
     */
    let alive = true;
    const refitOpts = { ...fitOpts, animate: false };
    const refit = () => {
      if (!alive || !map || !bounds?.isValid?.()) return;
      map.invalidateSize({ animate: false });
      map.fitBounds(bounds, refitOpts);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (alive) refit();
      });
    });

    const timers = [
      window.setTimeout(() => alive && refit(), 200),
      window.setTimeout(() => alive && refit(), 480),
    ];

    let vvDebounce;
    let vvNudge = 0;
    const onVvResize = () => {
      if (!alive || vvNudge >= 8) return;
      window.clearTimeout(vvDebounce);
      vvDebounce = window.setTimeout(() => {
        vvNudge += 1;
        refit();
      }, 140);
    };

    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    vv?.addEventListener?.("resize", onVvResize);

    return () => {
      alive = false;
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(vvDebounce);
      vv?.removeEventListener?.("resize", onVvResize);
    };
  }, [selectedIds, catchmentsBySchoolId, map, isPhone]);

  return null;
}
