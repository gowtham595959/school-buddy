import { useEffect, useRef, useState } from "react";
import { fetchAdmissionsPoliciesBySchoolId } from "./admissions.api";

/**
 * Loads admissions_policies for exam and/or allocation drawer sections (independent of catchment).
 */
export function useAdmissionsPolicies(schoolId, enabled) {
  const cacheRef = useRef({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [, setVersion] = useState(0);

  const shouldFetch = schoolId && enabled;
  const policies = cacheRef.current[schoolId]?.policies ?? null;

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

    fetchAdmissionsPoliciesBySchoolId(schoolId)
      .then((data) => {
        if (!cancelled) {
          cacheRef.current = {
            ...cacheRef.current,
            [schoolId]: { policies: data.policies ?? [] },
          };
          setVersion((v) => v + 1);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to load admissions data");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, enabled, shouldFetch]);

  return { policies, loading, error };
}
