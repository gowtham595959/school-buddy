import React from "react";
import CatchmentsV2Layer from "./CatchmentsV2Layer";

export default function SelectedCatchmentsLayers({
  selectedIds,
  catchmentsBySchoolId,
}) {
  return (
    <>
      {selectedIds.map((id) => {
        const payload = catchmentsBySchoolId[id];
        if (!payload?.definitions?.length) return null;

        return (
          <CatchmentsV2Layer
            key={`c:${id}`}
            schoolId={id}
            school={payload.school}
            schoolName={payload.school?.name || `School ${id}`}
            definitions={payload.definitions}
            geometriesByKey={payload.geometriesByKey}
          />
        );
      })}
    </>
  );
}
