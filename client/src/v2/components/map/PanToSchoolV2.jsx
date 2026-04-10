import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { getBoundsFromPayload } from "./FitCatchmentBounds";

const SCHOOL_FOCUS_ZOOM = 13;

/**
 * Pans the map to the most recently added school when that school has no
 * catchment geometry to fit (open-catchment schools like Wilson's).
 *
 * Works regardless of how many schools are currently selected.
 * Skips flyTo when the user only *removed* schools (deselect shouldn't snap
 * the map to a remaining school).
 */
export default function PanToSchoolV2({
  schools,
  selectedIds,
  catchmentsBySchoolId,
  pauseForTransport = false,
}) {
  const map = useMap();
  const prevSelectedIdsRef = useRef([]);

  useEffect(() => {
    const selected = Array.isArray(selectedIds) ? selectedIds : [];
    const prev = prevSelectedIdsRef.current;
    prevSelectedIdsRef.current = [...selected];

    if (pauseForTransport || !map) return;

    const newlyAdded = selected.filter((id) => !prev.includes(id));
    if (newlyAdded.length === 0) return;

    const targetId = newlyAdded[newlyAdded.length - 1];
    const school = schools.find((s) => s.id === targetId);
    if (!school) return;

    const lat = Number(school.lat);
    const lon = Number(school.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const payload = catchmentsBySchoolId?.[targetId];
    if (payload == null) return;

    if (payload.definitions?.length) {
      const bounds = getBoundsFromPayload(payload);
      if (bounds) return;
    }

    map.flyTo([lat, lon], SCHOOL_FOCUS_ZOOM, { duration: 0.55 });
  }, [map, pauseForTransport, schools, selectedIds, catchmentsBySchoolId]);

  return null;
}
