import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCatchmentsV2BySchoolId } from "./catchmentV2.api";

export function useSelectedCatchments() {
  const [selectedIds, setSelectedIds] = useState([]);
  const [catchmentsBySchoolId, setCatchmentsBySchoolId] = useState({});

  // Keep refs in sync so toggleSchool can read "latest" state reliably
  const selectedRef = useRef(selectedIds);
  const cacheRef = useRef(catchmentsBySchoolId);

  useEffect(() => {
    selectedRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    cacheRef.current = catchmentsBySchoolId;
  }, [catchmentsBySchoolId]);

  const toggleSchool = useCallback(async (id) => {
    const currentlySelected = selectedRef.current.includes(id);
    const nextSelected = currentlySelected
      ? selectedRef.current.filter((x) => x !== id)
      : [...selectedRef.current, id];

    setSelectedIds(nextSelected);

    // Only fetch when selecting (not deselecting) and not cached
    if (!currentlySelected && !cacheRef.current[id]) {
      try {
        const payload = await fetchCatchmentsV2BySchoolId(id);
        setCatchmentsBySchoolId((prev) => ({ ...prev, [id]: payload }));
      } catch {
        // Still cache so pan/zoom can treat as “no geometry” (e.g. network error).
        setCatchmentsBySchoolId((prev) => ({
          ...prev,
          [id]: { definitions: [], geometriesByKey: {} },
        }));
      }
    }
  }, []);

  const clearAllCatchments = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return { selectedIds, catchmentsBySchoolId, toggleSchool, clearAllCatchments };
}
