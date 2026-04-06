// client/src/v2/pages/ExplorePage.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";

import TopBar from "../components/layout/TopBar";
import LeftPanel from "../components/sidebar/LeftPanel";
import MobileSchoolCardsDeck from "../components/mobile/MobileSchoolCardsDeck";
import MapCanvas from "../components/map/MapCanvas";
import SchoolMarkersV2Layer from "../components/map/SchoolMarkersV2Layer";
import LegendControl from "../components/map/LegendControl";
import SelectedCatchmentsLayers from "../components/map/SelectedCatchmentsLayers";
import FitCatchmentBounds from "../components/map/FitCatchmentBounds";
import SchoolDetailDrawer from "../components/drawer/SchoolDetailDrawer";
import PanToHomeV2 from "../components/map/PanToHomeV2";
import PanToSchoolV2 from "../components/map/PanToSchoolV2";
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
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSchoolListBuckets } from "../hooks/useSchoolListBuckets";

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

const PHONE_MAX_WIDTH = "(max-width: 767px)";

export default function ExplorePage() {
  const [legendOpen, setLegendOpen] = useState(false);
  const [drawerSchool, setDrawerSchool] = useState(null);
  const isPhoneLayout = useMediaQuery(PHONE_MAX_WIDTH);
  /** Last school focused from list row or map pin (drawer/transport take precedence on map ring). */
  const [mapAnchorSchool, setMapAnchorSchool] = useState(null);

  const {
    postcode,
    setPostcode,
    homePosition,
    homeError,
    submitPostcode,
    setHomeFromMap,
  } = useHomeLocation(DEFAULT_POSTCODE);

  const { schools, schoolsNear, openCatchment } = useSchools();

  const { selectedIds, catchmentsBySchoolId, toggleSchool, clearAllCatchments } =
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

  const homeLat = homePosition?.[0];
  const homeLon = homePosition?.[1];
  useEffect(() => {
    setMapAnchorSchool(null);
  }, [homeLat, homeLon]);

  const { topItems, middleItems, bottomItems } = useSchoolListBuckets({
    inCatchmentSchools,
    catchmentCheckBySchoolId,
    allSchools: schools,
    schoolsNear,
    homeLocation: transport.homeLocation,
  });

  const handleOpenSchoolDetails = useCallback(
    (s) => {
      setMapAnchorSchool(s);
      setDrawerSchool((prev) => (prev?.id === s.id ? null : s));
      if (transport.transportSchool?.id && transport.transportSchool.id !== s.id) {
        transport.closeTransport();
      }
    },
    [transport.transportSchool?.id, transport.closeTransport]
  );

  const handleSchoolRowClick = useCallback(
    (s) => {
      setMapAnchorSchool(s);
      setDrawerSchool((prev) => (prev && prev.id !== s.id ? null : prev));
      if (transport.transportSchool?.id && transport.transportSchool.id !== s.id) {
        transport.closeTransport();
      }
    },
    [transport.transportSchool?.id, transport.closeTransport]
  );

  /**
   * Map pin: first click = same focus as row click + show catchment (like ticking the checkbox).
   * Second click = hide catchment and clear drawer/anchor for that school (like unticking).
   */
  const handleSchoolMarkerClick = useCallback(
    (schoolId) => {
      const s = schools.find((x) => x.id === schoolId);
      if (!s) return;
      const id = s.id;

      const isOn = selectedIds.includes(id);
      if (isOn) {
        void toggleSchool(id);
        setMapAnchorSchool((prev) => (prev?.id === id ? null : prev));
        setDrawerSchool((prev) => (prev?.id === id ? null : prev));
        if (transport.transportSchool?.id === id) {
          transport.closeTransport();
        }
        return;
      }

      handleSchoolRowClick(s);
      void toggleSchool(id);
    },
    [
      schools,
      selectedIds,
      toggleSchool,
      handleSchoolRowClick,
      transport.transportSchool?.id,
      transport.closeTransport,
    ]
  );

  const handleCloseDrawer = useCallback(() => setDrawerSchool(null), []);

  useEffect(() => {
    if (!isPhoneLayout || !drawerSchool) return;
    const onKey = (e) => {
      if (e.key === "Escape") setDrawerSchool(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPhoneLayout, drawerSchool]);

  const handleToggleLegend = useCallback(() => setLegendOpen((prev) => !prev), []);

  const mapFocusSchool =
    drawerSchool ?? transport.transportSchool ?? mapAnchorSchool ?? null;

  return (
    <div className={`v2-page${isPhoneLayout ? " v2-page--phone" : ""}`} style={SHELL_STYLE}>
      <TopBar
        postcode={postcode}
        defaultPostcode={DEFAULT_POSTCODE}
        onPostcodeChange={setPostcode}
        onChangePostcode={setPostcode}
        onPostcodeSubmit={submitPostcode}
        onSubmitPostcode={submitPostcode}
        error={homeError}
      />

      <div className={`v2-body${isPhoneLayout ? " v2-body--phone" : ""}`} style={BODY_STYLE}>
        {!isPhoneLayout ? (
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
              onClearAllCatchments={clearAllCatchments}
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
              focusedSchoolId={mapFocusSchool?.id ?? null}
            />
          </div>
        ) : null}

        {isPhoneLayout && drawerSchool ? (
          <button
            type="button"
            className="v2-mobile-drawer-backdrop"
            aria-label="Close school details"
            onClick={handleCloseDrawer}
          />
        ) : null}

        {drawerSchool ? (
          <div
            className={`v2-drawer-sidebar${isPhoneLayout ? " v2-drawer-sidebar--phone" : ""}`}
          >
            <SchoolDetailDrawer
              school={drawerSchool}
              onClose={handleCloseDrawer}
              selectedIds={selectedIds}
              onShowCatchment={toggleSchool}
              scrollToTopOnSchoolChange={isPhoneLayout}
            />
          </div>
        ) : null}

        <div className="v2-map-wrap" style={MAP_WRAP_STYLE}>
          <MapCanvas center={homePosition} zoom={11}>
            <PanToHomeV2 position={homePosition} />

            <HomeMarkerV2Layer position={homePosition} postcode={postcode} />
            <SetHomeOnMapClickV2 onSetHome={setHomeFromMap} />

            <SchoolMarkersV2Layer
              schools={schools}
              highlightSchoolId={mapFocusSchool?.id ?? null}
              onSchoolMarkerClick={handleSchoolMarkerClick}
            />

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

            <PanToSchoolV2
              schools={schools}
              selectedIds={selectedIds}
              catchmentsBySchoolId={catchmentsBySchoolId}
              pauseForTransport={!!transport.transportSchool}
            />

            <LegendControl
              open={legendOpen}
              onToggle={handleToggleLegend}
            />
          </MapCanvas>
        </div>

        {isPhoneLayout ? (
          <MobileSchoolCardsDeck
            homeScrollKey={`${homeLat ?? ""},${homeLon ?? ""}`}
            topItems={topItems}
            middleItems={middleItems}
            bottomItems={bottomItems}
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
            focusedSchoolId={mapFocusSchool?.id ?? null}
            catchmentCheckBySchoolId={catchmentCheckBySchoolId}
            catchmentLoading={catchmentLoading}
            onClearAllCatchments={clearAllCatchments}
          />
        ) : null}
      </div>
    </div>
  );
}