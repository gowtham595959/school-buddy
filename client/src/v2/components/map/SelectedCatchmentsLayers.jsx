import React from "react";
import CatchmentsV2Layer from "./CatchmentsV2Layer";
import { filterDefinitionsToLatestYear } from "../../utils/catchmentYearUtils";

export default function SelectedCatchmentsLayers({
  selectedIds,
  catchmentsBySchoolId,
}) {
  return (
    <>
      {selectedIds.map((id) => {
        const payload = catchmentsBySchoolId[id];
        if (!payload?.definitions?.length) return null;

        const definitions = filterDefinitionsToLatestYear(payload.definitions);
        if (!definitions.length) return null;

        return (
          <CatchmentsV2Layer
            key={`c:${id}`}
            schoolId={id}
            school={payload.school}
            schoolName={payload.school?.name || `School ${id}`}
            definitions={definitions}
            geometriesByKey={payload.geometriesByKey}
          />
        );
      })}
    </>
  );
}
