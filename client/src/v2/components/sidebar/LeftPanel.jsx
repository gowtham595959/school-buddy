// client/src/v2/components/sidebar/LeftPanel.jsx

import React, { useMemo } from "react";
import SchoolListSection from "./SchoolListSection";

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
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cat(s) {
  return String(s?.catchment_category || "").trim().toLowerCase();
}

export default function LeftPanel({
  inCatchmentSchools,
  catchmentCheckBySchoolId,
  catchmentLoading,
  schoolsNear,
  openCatchment,
  allSchools,
  selectedIds,
  onToggleSchool,
  homeLocation,
  transportSchool,
  onOpenTransport,
  onCloseTransport,
  onSelectRoute,
  onHoverRoute,
  onLeaveRoute,
  onLeaveOptionsList,
  onClearRoute,
}) {
  const safeAllSchools = Array.isArray(allSchools)
    ? allSchools
    : Array.isArray(schoolsNear)
    ? schoolsNear
    : Array.isArray(inCatchmentSchools)
    ? inCatchmentSchools
    : [];

  const safeCatchmentMap = catchmentCheckBySchoolId || {};
  const homeLat = Number(homeLocation?.lat);
  const homeLon = Number(homeLocation?.lon);

  const { topItems, middleItems, bottomItems } = useMemo(() => {
    const schools = safeAllSchools;

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

    return { topItems: top, middleItems: middle, bottomItems: bottom };
  }, [safeAllSchools, safeCatchmentMap, homeLat, homeLon]);

  return (
    <div className="v2-left-panel">
      <div className="v2-panel-top">
        <input className="v2-search" placeholder="Search school" />
        <button className="v2-filter-btn">Filter</button>
        <button className="v2-icon-btn">♡</button>
      </div>

      <SchoolListSection
        title="Schools in Catchment"
        items={topItems}
        selectedIds={selectedIds}
        onToggle={onToggleSchool}
        homeLocation={homeLocation}
        transportSchool={transportSchool}
        onOpenTransport={onOpenTransport}
        onCloseTransport={onCloseTransport}
        onSelectRoute={onSelectRoute}
        onHoverRoute={onHoverRoute}
        onLeaveRoute={onLeaveRoute}
        onLeaveOptionsList={onLeaveOptionsList}
        onClearRoute={onClearRoute}
        showCatchmentHover
        catchmentCheckBySchoolId={catchmentCheckBySchoolId}
        catchmentLoading={catchmentLoading}
        emptyText="No schools found in catchment for this home."
      />

      <SchoolListSection
        title="Schools with Open Catchment"
        items={middleItems}
        selectedIds={selectedIds}
        onToggle={onToggleSchool}
        homeLocation={homeLocation}
        transportSchool={transportSchool}
        onOpenTransport={onOpenTransport}
        onCloseTransport={onCloseTransport}
        onSelectRoute={onSelectRoute}
        onHoverRoute={onHoverRoute}
        onLeaveRoute={onLeaveRoute}
        onLeaveOptionsList={onLeaveOptionsList}
        onClearRoute={onClearRoute}
        initialVisible={10}
        loadStep={10}
        showLoadMore
        scrollHeight={480}
        emptyText="No open-catchment schools to show."
      />

      <SchoolListSection
        title="All Other Schools"
        items={bottomItems}
        selectedIds={selectedIds}
        onToggle={onToggleSchool}
        homeLocation={homeLocation}
        transportSchool={transportSchool}
        onOpenTransport={onOpenTransport}
        onCloseTransport={onCloseTransport}
        onSelectRoute={onSelectRoute}
        onHoverRoute={onHoverRoute}
        onLeaveRoute={onLeaveRoute}
        onLeaveOptionsList={onLeaveOptionsList}
        onClearRoute={onClearRoute}
        initialVisible={10}
        loadStep={10}
        showLoadMore
        scrollHeight={480}
        emptyText="No other schools to show."
      />
    </div>
  );
}
