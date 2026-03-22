import { useEffect, useRef, useState } from "react";
import { fetchCatchmentsV2BySchoolId } from "./catchmentV2.api";

/**
 * Fetches catchment data for the school detail drawer when a school with
 * has_catchment is opened. Caches results by schoolId to avoid refetching.
 */
export function useCatchmentForDrawer(schoolId, hasCatchment) {
  const cacheRef = useRef({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [, setVersion] = useState(0);

  const shouldFetch = schoolId && hasCatchment;
  const payload = cacheRef.current[schoolId] ?? null;

  useEffect(() => {
    if (!shouldFetch) {
      setError(null);
      return;
    }

    if (cacheRef.current[schoolId]) {
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCatchmentsV2BySchoolId(schoolId)
      .then((data) => {
        if (!cancelled) {
          cacheRef.current = { ...cacheRef.current, [schoolId]: data };
          setVersion((v) => v + 1);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to load catchment data");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, hasCatchment, shouldFetch]);

  return { payload, loading, error };
}
