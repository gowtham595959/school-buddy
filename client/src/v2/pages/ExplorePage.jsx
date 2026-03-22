// client/src/v2/pages/ExplorePage.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";

import TopBar from "../components/layout/TopBar";
import LeftPanel from "../components/sidebar/LeftPanel";
import MapCanvas from "../components/map/MapCanvas";
import SchoolMarkersV2Layer from "../components/map/SchoolMarkersV2Layer";
import LegendControl from "../components/map/LegendControl";
import SelectedCatchmentsLayers from "../components/map/SelectedCatchmentsLayers";
import FitCatchmentBounds from "../components/map/FitCatchmentBounds";
import SchoolDetailDrawer from "../components/drawer/SchoolDetailDrawer";
import PanToHomeV2 from "../components/map/PanToHomeV2";
import HomeMarkerV2Layer from "../components/map/HomeMarkerV2Layer";
import SetHomeOnMapClickV2 from "../components/map/SetHomeOnMapClickV2";
import TransportRouteLayer from "../components/transport/TransportRouteLayer";
import FitRouteBounds from "../components/transport/FitRouteBounds";
import FitHomeSchoolBounds from "../components/transport/FitHomeSchoolBounds";
import { DEFAULT_POSTCODE } from "../config/defaultPostcode";
import { useHomeLocation } from "../domains/home/useHomeLocation";
import { useSchools } from "../domains/schools/useSchools";
import { useSelectedCatchments } from "../domains/catchmentV2/useSelectedCatchments";
import useTransportUI from "../domains/transport/useTransportUI";
import { useCatchmentCheck } from "../domains/catchmentCheck/useCatchmentCheck";

// Static layout styles (avoid recreating on every render)
const SHELL_STYLE = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};
const BODY_STYLE = { flex: 1, display: "flex", minHeight: 0 };
const MAP_WRAP_STYLE = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  position: "relative",
};
const SIDEBAR_STYLE = { minHeight: 0, overflow: "auto" };

export default function ExplorePage() {
  const [legendOpen, setLegendOpen] = useState(false);
  const [drawerSchool, setDrawerSchool] = useState(null);

  const {
    postcode,
    setPostcode,
    homePosition,
    homeError,
    submitPostcode,
    setHomeFromMap,
  } = useHomeLocation(DEFAULT_POSTCODE);

  const { schools, schoolsNear, openCatchment } = useSchools();

  const { selectedIds, catchmentsBySchoolId, toggleSchool } =
    useSelectedCatchments();

  const transport = useTransportUI({ homePosition, postcode });

  // Close drawer when transport opens for a different school
  const transportSchoolId = transport.transportSchool?.id;
  useEffect(() => {
    if (transportSchoolId && drawerSchool?.id && transportSchoolId !== drawerSchool.id) {
      setDrawerSchool(null);
    }
  }, [transportSchoolId, drawerSchool?.id]);

  const schoolIds = useMemo(() => {
    if (!Array.isArray(schools)) return [];
    return schools.map((s) => s.id).filter((id) => typeof id === "number");
  }, [schools]);

  const { loading: catchmentLoading, catchmentCheckBySchoolId } =
    useCatchmentCheck({
      schoolIds,
      homeLocation: transport.homeLocation,
    });

  const inCatchmentSchools = useMemo(() => {
    if (!Array.isArray(schools)) return [];
    const map = catchmentCheckBySchoolId || {};
    return schools.filter((s) => !!map?.[s.id]?.inCatchment);
  }, [schools, catchmentCheckBySchoolId]);

  const handleOpenSchoolDetails = useCallback(
    (s) => {
      setDrawerSchool((prev) => (prev?.id === s.id ? null : s));
      if (transport.transportSchool?.id && transport.transportSchool.id !== s.id) {
        transport.closeTransport();
      }
    },
    [transport.transportSchool?.id, transport.closeTransport]
  );

  const handleSchoolRowClick = useCallback(
    (s) => {
      setDrawerSchool((prev) => (prev && prev.id !== s.id ? null : prev));
      if (transport.transportSchool?.id && transport.transportSchool.id !== s.id) {
        transport.closeTransport();
      }
    },
    [transport.transportSchool?.id, transport.closeTransport]
  );

  const handleCloseDrawer = useCallback(() => setDrawerSchool(null), []);

  const handleToggleLegend = useCallback(() => setLegendOpen((prev) => !prev), []);

  return (
    <div className="v2-page" style={SHELL_STYLE}>
      <TopBar
        postcode={postcode}
        defaultPostcode={DEFAULT_POSTCODE}
        onPostcodeChange={setPostcode}
        onChangePostcode={setPostcode}
        onPostcodeSubmit={submitPostcode}
        onSubmitPostcode={submitPostcode}
        error={homeError}
      />

      <div className="v2-body" style={BODY_STYLE}>
        <div className="v2-sidebar" style={SIDEBAR_STYLE}>
          <LeftPanel
            inCatchmentSchools={inCatchmentSchools}
            catchmentCheckBySchoolId={catchmentCheckBySchoolId}
            catchmentLoading={catchmentLoading}
            allSchools={schools}
            schoolsNear={schoolsNear}
            openCatchment={openCatchment}
            selectedIds={selectedIds}
            onToggleSchool={toggleSchool}
            homeLocation={transport.homeLocation}
            transportSchool={transport.transportSchool}
            onOpenTransport={transport.toggleTransportForSchool}
            onCloseTransport={transport.closeTransport}
            onSelectRoute={transport.onSelectRoute}
            onHoverRoute={transport.onHoverRoute}
            onLeaveRoute={transport.onLeaveRoute}
            onLeaveOptionsList={transport.onLeaveOptionsList}
            onClearRoute={transport.onClearRoute}
            onOpenSchoolDetails={handleOpenSchoolDetails}
            onSchoolRowClick={handleSchoolRowClick}
            drawerSchoolId={drawerSchool?.id}
          />
        </div>

        {drawerSchool ? (
          <div className="v2-drawer-sidebar">
            <SchoolDetailDrawer
              school={drawerSchool}
              onClose={handleCloseDrawer}
              selectedIds={selectedIds}
              onShowCatchment={toggleSchool}
            />
          </div>
        ) : null}

        <div className="v2-map-wrap" style={MAP_WRAP_STYLE}>
          <MapCanvas center={homePosition} zoom={11}>
            <PanToHomeV2 position={homePosition} />

            <HomeMarkerV2Layer position={homePosition} postcode={postcode} />
            <SetHomeOnMapClickV2 onSetHome={setHomeFromMap} />

            <SchoolMarkersV2Layer schools={schools} />

            <SelectedCatchmentsLayers
              selectedIds={selectedIds}
              catchmentsBySchoolId={catchmentsBySchoolId}
            />
            <FitCatchmentBounds
              selectedIds={selectedIds}
              catchmentsBySchoolId={catchmentsBySchoolId}
            />

            <TransportRouteLayer route={transport.activeRoute} />
            <FitRouteBounds route={transport.activeRoute} />
            <FitHomeSchoolBounds
              homePosition={homePosition}
              school={transport.transportSchool}
            />

            <LegendControl
              open={legendOpen}
              onToggle={handleToggleLegend}
            />
          </MapCanvas>
        </div>
      </div>
    </div>
  );
}