import { useEffect, useState } from "react";

export function useKs5Results(schoolId, enabled) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !schoolId) {
      setRows([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/schools/${schoolId}/ks5-results`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load A level results");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, enabled]);

  return { rows, loading, error };
}
