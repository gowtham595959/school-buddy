import { useEffect, useRef, useState } from "react";
import { fetchInspectionsBySchoolId } from "./inspections.api";

export function useInspections(schoolId, enabled) {
  const cacheRef = useRef({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [, setVersion] = useState(0);

  const shouldFetch = schoolId && enabled;
  const rows = cacheRef.current[schoolId]?.rows ?? null;

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

    fetchInspectionsBySchoolId(schoolId)
      .then((data) => {
        if (!cancelled) {
          cacheRef.current = {
            ...cacheRef.current,
            [schoolId]: { rows: Array.isArray(data) ? data : [] },
          };
          setVersion((v) => v + 1);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load inspections");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, enabled, shouldFetch]);

  return { rows, loading, error };
}
