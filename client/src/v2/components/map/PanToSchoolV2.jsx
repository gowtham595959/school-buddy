import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { getBoundsFromPayload } from "./FitCatchmentBounds";

const SCHOOL_FOCUS_ZOOM = 13;
/** Nudge map view up on phone so the pin sits in the area above the bottom card deck */
const PHONE_PAN_AFTER_FOCUS_PX = 115;

function schoolWithCoords(s) {
  if (!s || s.id == null) return null;
  const lat = Number(s.lat);
  const lon = Number(s.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return s;
}

/**
 * Pans only when exactly one school is selected and there is no catchment geometry to fit.
 * Skips flyTo when the user only **removed** other school(s) (e.g. unchecked Tiffin and left Wilson’s
 * alone) so the map does not snap back to Wilson’s on every uncheck. Still flies when the sole school
 * is newly selected from empty or when multiple schools were never in play (scenario 1).
 */
export default function PanToSchoolV2({
  schools,
  selectedIds,
  catchmentsBySchoolId,
  pauseForTransport = false,
}) {
  const map = useMap();
  const isPhone = useMediaQuery("(max-width: 767px)");
  const lastFlyKeyRef = useRef("");
  const prevSelectedIdsRef = useRef([]);

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
    const selected = Array.isArray(selectedIds) ? [...selectedIds] : [];
    const prev = prevSelectedIdsRef.current;

    const skipFlyOnlyRemovedOthers =
      selected.length === 1 &&
      prev.length > 1 &&
      prev.includes(selected[0]);

    prevSelectedIdsRef.current = selected;

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

    if (skipFlyOnlyRemovedOthers) {
      lastFlyKeyRef.current = flyKey;
      return;
    }

    if (lastFlyKeyRef.current === flyKey) return;
    lastFlyKeyRef.current = flyKey;

    map.flyTo([lat, lon], SCHOOL_FOCUS_ZOOM, { duration: 0.55 });

    if (isPhone) {
      const nudge = () => {
        map.panBy([0, PHONE_PAN_AFTER_FOCUS_PX], { animate: false });
      };
      map.once("moveend", nudge);
    }
  }, [map, pauseForTransport, id, lat, lon, payloadForSchool, selectedIds, isPhone]);

  return null;
}
