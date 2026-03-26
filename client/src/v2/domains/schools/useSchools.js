import { useEffect, useMemo, useState } from "react";
import { fetchSchools } from "./schools.api";

export function useSchools() {
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSchools();
        setSchools(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Schools API failed:", e?.message || e);
        setSchools([]);
      }
    })();
  }, []);

  const schoolsNear = useMemo(() => schools.slice(0, 10), [schools]);

  const openCatchment = useMemo(
    () => schools.filter((s) => s.has_catchment).slice(0, 10),
    [schools]
  );

  return { schools, schoolsNear, openCatchment };
}
