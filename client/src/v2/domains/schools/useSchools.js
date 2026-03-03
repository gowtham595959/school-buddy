import { useEffect, useMemo, useState } from "react";
import { fetchSchools } from "./schools.api";

export function useSchools() {
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await fetchSchools();
      setSchools(data);
    })().catch(console.error);
  }, []);

  const schoolsNear = useMemo(() => schools.slice(0, 10), [schools]);

  const openCatchment = useMemo(
    () => schools.filter((s) => s.has_catchment).slice(0, 10),
    [schools]
  );

  return { schools, schoolsNear, openCatchment };
}
