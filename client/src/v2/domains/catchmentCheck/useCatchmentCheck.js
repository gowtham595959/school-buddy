// client/src/v2/domains/catchmentCheck/useCatchmentCheck.js
import { useEffect, useMemo, useRef, useState } from "react";
import { runCatchmentCheck } from "./catchmentCheck.service";

export function useCatchmentCheck({ schoolIds, homeLocation }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [catchmentCheckBySchoolId, setCatchmentCheckBySchoolId] = useState({});

  // ✅ Stabilize key: round lat/lon to avoid tiny changes causing refetch
  const key = useMemo(() => {
    const lat =
      typeof homeLocation?.lat === "number" ? homeLocation.lat.toFixed(5) : "x";
    const lon =
      typeof homeLocation?.lon === "number" ? homeLocation.lon.toFixed(5) : "x";
    const ids = Array.isArray(schoolIds) ? schoolIds.join(",") : "";
    return `${lat}|${lon}|${ids}`;
  }, [homeLocation?.lat, homeLocation?.lon, schoolIds]);

  const latestKeyRef = useRef(key);
  useEffect(() => {
    latestKeyRef.current = key;
  }, [key]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);

      // Only clear when inputs are actually missing
      if (!homeLocation || !Array.isArray(schoolIds) || schoolIds.length === 0) {
        setCatchmentCheckBySchoolId({});
        return;
      }

      // ✅ Keep old results while loading new ones
      setLoading(true);

      try {
        const out = await runCatchmentCheck({ schoolIds, homeLocation });

        if (cancelled) return;
        if (latestKeyRef.current !== key) return;

        setCatchmentCheckBySchoolId(out.catchmentCheckBySchoolId || {});
      } catch (e) {
        if (cancelled) return;
        if (latestKeyRef.current !== key) return;

        setError(e?.message || "Catchment check failed");
        // ✅ Keep previous results on error (don’t blank tooltips)
      } finally {
        if (cancelled) return;
        if (latestKeyRef.current !== key) return;

        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [key, homeLocation, schoolIds]);

  return { loading, error, catchmentCheckBySchoolId };
}
