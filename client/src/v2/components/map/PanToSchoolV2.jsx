import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import { getBoundsFromPayload } from "./FitCatchmentBounds";

const SCHOOL_FOCUS_ZOOM = 13;

function schoolWithCoords(s) {
  if (!s || s.id == null) return null;
  const lat = Number(s.lat);
  const lon = Number(s.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return s;
}

/**
 * Pans only for catchment selection when exactly one school is selected and there is no geometry to fit.
 * Depends on that school's cached payload only (not the whole catchments map) so other schools' cache
 * updates do not retrigger flyTo. Resets dedupe when the selected school id changes.
 */
export default function PanToSchoolV2({
  schools,
  selectedIds,
  catchmentsBySchoolId,
  pauseForTransport = false,
}) {
  const map = useMap();
  const lastFlyKeyRef = useRef("");

  const target = useMemo(() => {
    if (!Array.isArray(selectedIds) || selectedIds.length !== 1) return null;
    const sid = selectedIds[0];
    return schoolWithCoords(schools.find((x) => x.id === sid));
  }, [selectedIds, schools]);

  const id = target?.id;
  const lat = target != null ? Number(target.lat) : NaN;
  const lon = target != null ? Number(target.lon) : NaN;

  const payloadForSchool = id != null ? catchmentsBySchoolId?.[id] : undefined;

  useEffect(() => {
    lastFlyKeyRef.current = "";
  }, [id]);

  useEffect(() => {
    if (pauseForTransport) return;
    if (!map || id == null) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    if (payloadForSchool == null) return;

    if (payloadForSchool.definitions?.length) {
      const bounds = getBoundsFromPayload(payloadForSchool);
      if (bounds) return;
    }

    const defCount = payloadForSchool.definitions?.length ?? 0;
    const flyKey = `${id}|d${defCount}`;
    if (lastFlyKeyRef.current === flyKey) return;
    lastFlyKeyRef.current = flyKey;

    map.flyTo([lat, lon], SCHOOL_FOCUS_ZOOM, { duration: 0.55 });
  }, [map, pauseForTransport, id, lat, lon, payloadForSchool]);

  return null;
}
