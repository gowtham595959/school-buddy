import { useMemo } from "react";

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  )
    return Infinity;

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cat(s) {
  return String(s?.catchment_category || "").trim().toLowerCase();
}

/**
 * Same three-bucket split as LeftPanel: in-catchment, open-catchment, other — sorted by distance from home.
 */
export function useSchoolListBuckets({
  inCatchmentSchools,
  catchmentCheckBySchoolId,
  allSchools,
  schoolsNear,
  homeLocation,
}) {
  const homeLat = Number(homeLocation?.lat);
  const homeLon = Number(homeLocation?.lon);

  return useMemo(() => {
    const schools = Array.isArray(allSchools)
      ? allSchools
      : Array.isArray(schoolsNear)
      ? schoolsNear
      : Array.isArray(inCatchmentSchools)
      ? inCatchmentSchools
      : [];

    const safeCatchmentMap = catchmentCheckBySchoolId || {};

    const withDist = (arr) =>
      arr
        .map((s) => ({
          s,
          d: distanceKm(homeLat, homeLon, Number(s.lat), Number(s.lon)),
        }))
        .sort((a, b) => a.d - b.d)
        .map((x) => x.s);

    const topRaw = schools.filter((s) => {
      const check = safeCatchmentMap?.[s.id];
      if (!check?.inCatchment) return false;
      return cat(s) !== "open";
    });
    const top = withDist(topRaw);
    const topIds = new Set(top.map((s) => s.id));

    const middleRaw = schools.filter((s) => {
      if (topIds.has(s.id)) return false;
      const c = cat(s);
      return c === "open" || c === "both";
    });
    const middle = withDist(middleRaw);
    const middleIds = new Set(middle.map((s) => s.id));

    const bottomRaw = schools.filter(
      (s) => !topIds.has(s.id) && !middleIds.has(s.id)
    );
    const bottom = withDist(bottomRaw);

    return {
      topItems: top,
      middleItems: middle,
      bottomItems: bottom,
    };
  }, [
    allSchools,
    schoolsNear,
    inCatchmentSchools,
    catchmentCheckBySchoolId,
    homeLat,
    homeLon,
  ]);
}
