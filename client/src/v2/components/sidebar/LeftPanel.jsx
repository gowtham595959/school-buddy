// client/src/v2/components/sidebar/LeftPanel.jsx

import React from "react";
import SchoolListSection from "./SchoolListSection";
import { useSchoolListBuckets } from "../../hooks/useSchoolListBuckets";

export default function LeftPanel({
  inCatchmentSchools,
  catchmentCheckBySchoolId,
  catchmentLoading,
  schoolsNear,
  openCatchment: _openCatchment,
  allSchools,
  selectedIds,
  onToggleSchool,
  onClearAllCatchments,
  homeLocation,
  transportSchool,
  onOpenTransport,
  onCloseTransport,
  onSelectRoute,
  onHoverRoute,
  onLeaveRoute,
  onLeaveOptionsList,
  onClearRoute,
  onOpenSchoolDetails,
  onSchoolRowClick,
  drawerSchoolId,
  /** Matches map ring + pan: drawer → transport → last row click */
  focusedSchoolId,
}) {
  const { topItems, middleItems, bottomItems } = useSchoolListBuckets({
    inCatchmentSchools,
    catchmentCheckBySchoolId,
    allSchools,
    schoolsNear,
    homeLocation,
  });

  return (
    <div className="v2-left-panel">
      <div className="v2-panel-top">
        <input className="v2-search" placeholder="Search school" />
        <button type="button" className="v2-filter-btn">
          Filter
        </button>
        <button type="button" className="v2-icon-btn">
          ♡
        </button>
      </div>

      <SchoolListSection
        title="Schools in Catchment"
        sectionAccent="green"
        items={topItems}
        selectedIds={selectedIds}
        onToggle={onToggleSchool}
        onClearAllCatchments={onClearAllCatchments}
        homeLocation={homeLocation}
        transportSchool={transportSchool}
        onOpenTransport={onOpenTransport}
        onCloseTransport={onCloseTransport}
        onSelectRoute={onSelectRoute}
        onHoverRoute={onHoverRoute}
        onLeaveRoute={onLeaveRoute}
        onLeaveOptionsList={onLeaveOptionsList}
        onClearRoute={onClearRoute}
        onOpenDetails={onOpenSchoolDetails}
        onRowClick={onSchoolRowClick}
        drawerSchoolId={drawerSchoolId}
        focusedSchoolId={focusedSchoolId}
        showCatchmentHover
        catchmentCheckBySchoolId={catchmentCheckBySchoolId}
        catchmentLoading={catchmentLoading}
        emptyText="No schools found in catchment for this home."
      />

      <SchoolListSection
        title="Schools with Open Catchment"
        sectionAccent="blue"
        items={middleItems}
        selectedIds={selectedIds}
        onToggle={onToggleSchool}
        onClearAllCatchments={onClearAllCatchments}
        homeLocation={homeLocation}
        transportSchool={transportSchool}
        onOpenTransport={onOpenTransport}
        onCloseTransport={onCloseTransport}
        onSelectRoute={onSelectRoute}
        onHoverRoute={onHoverRoute}
        onLeaveRoute={onLeaveRoute}
        onLeaveOptionsList={onLeaveOptionsList}
        onClearRoute={onClearRoute}
        onOpenDetails={onOpenSchoolDetails}
        onRowClick={onSchoolRowClick}
        drawerSchoolId={drawerSchoolId}
        focusedSchoolId={focusedSchoolId}
        initialVisible={10}
        loadStep={10}
        showLoadMore
        scrollHeight={480}
        emptyText="No open-catchment schools to show."
      />

      <SchoolListSection
        title="All Other Schools"
        sectionAccent="yellow"
        items={bottomItems}
        selectedIds={selectedIds}
        onToggle={onToggleSchool}
        onClearAllCatchments={onClearAllCatchments}
        homeLocation={homeLocation}
        transportSchool={transportSchool}
        onOpenTransport={onOpenTransport}
        onCloseTransport={onCloseTransport}
        onSelectRoute={onSelectRoute}
        onHoverRoute={onHoverRoute}
        onLeaveRoute={onLeaveRoute}
        onLeaveOptionsList={onLeaveOptionsList}
        onClearRoute={onClearRoute}
        onOpenDetails={onOpenSchoolDetails}
        onRowClick={onSchoolRowClick}
        drawerSchoolId={drawerSchoolId}
        focusedSchoolId={focusedSchoolId}
        initialVisible={10}
        loadStep={10}
        showLoadMore
        scrollHeight={480}
        emptyText="No other schools to show."
      />
    </div>
  );
}
