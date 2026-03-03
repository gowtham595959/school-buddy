// client/src/v2/domains/catchmentCheck/catchmentCheck.service.js
import { fetchCatchmentCheck } from "./catchmentCheck.api";

export function buildCatchmentCheckPayload({ schoolIds, homeLocation }) {
  if (!Array.isArray(schoolIds) || schoolIds.length === 0) return null;

  const lat = Number(homeLocation?.lat);
  const lon = Number(homeLocation?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    school_ids: schoolIds,
    user_location: { lat, lon },
  };
}

// ✅ Keep full response detail per school (needed for tooltip)
export function toCatchmentCheckBySchoolId(results) {
  const map = {};
  if (!Array.isArray(results)) return map;

  for (const r of results) {
    const id = r?.school_id;
    if (typeof id !== "number") continue;

    map[id] = {
      inCatchment: !!r?.in_catchment,
      matchedBy: r?.matched_by ?? null,
      distanceKm: typeof r?.distance_km === "number" ? r.distance_km : null,
    };
  }

  return map;
}

export async function runCatchmentCheck({ schoolIds, homeLocation }) {
  const payload = buildCatchmentCheckPayload({ schoolIds, homeLocation });
  if (!payload) return { raw: [], catchmentCheckBySchoolId: {} };

  const raw = await fetchCatchmentCheck(payload);

  return {
    raw,
    catchmentCheckBySchoolId: toCatchmentCheckBySchoolId(raw),
  };
}
