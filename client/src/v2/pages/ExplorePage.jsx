// client/src/v2/pages/ExplorePage.jsx

import React, { useMemo, useState } from "react";

import TopBar from "../components/layout/TopBar";
import LeftPanel from "../components/sidebar/LeftPanel";
import MapCanvas from "../components/map/MapCanvas";
import SchoolMarkersV2Layer from "../components/map/SchoolMarkersV2Layer";
import LegendControl from "../components/map/LegendControl";
import SelectedCatchmentsLayers from "../components/map/SelectedCatchmentsLayers";

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

export default function ExplorePage() {
  const [legendOpen, setLegendOpen] = useState(false);

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

  // ✅ IMPORTANT: define height in the component tree (fixes bottom white area)
  const shellStyle = {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  };

  const bodyStyle = {
    flex: 1,
    display: "flex",
    minHeight: 0,
  };

  const mapWrapStyle = {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    position: "relative",
  };

  // ✅ Non-breaking: width sizing moved to CSS (.v2-sidebar) via CSS vars
  const sidebarStyle = {
    minHeight: 0,
    overflow: "auto",
  };

  return (
    <div className="v2-page" style={shellStyle}>
   <TopBar
  postcode={postcode}
  // support both prop conventions (non-breaking)
  onChangePostcode={setPostcode}
  onSubmitPostcode={submitPostcode}
  onPostcodeChange={setPostcode}
  onPostcodeSubmit={submitPostcode}
  error={homeError}
/>

      <div className="v2-body" style={bodyStyle}>
        <div className="v2-sidebar" style={sidebarStyle}>
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
            onOpenTransport={transport.openTransportForSchool}
            onCloseTransport={transport.closeTransport}
            onSelectRoute={transport.onSelectRoute}
            onHoverRoute={transport.onHoverRoute}
            onLeaveRoute={transport.onLeaveRoute}
            onLeaveOptionsList={transport.onLeaveOptionsList}
            // ✅ FIX: support both naming variants in useTransportUI
            onClearRoute={transport.clearRoute || transport.onClearRoute}
          />
        </div>

        <div className="v2-map-wrap" style={mapWrapStyle}>
          <MapCanvas center={homePosition} zoom={11}>
            <PanToHomeV2 position={homePosition} />

            <HomeMarkerV2Layer position={homePosition} postcode={postcode} />
            <SetHomeOnMapClickV2 onSetHome={setHomeFromMap} />

            <SchoolMarkersV2Layer schools={schools} />

            <SelectedCatchmentsLayers
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
              onToggle={() => setLegendOpen(!legendOpen)}
            />
          </MapCanvas>
        </div>
      </div>
    </div>
  );
}
