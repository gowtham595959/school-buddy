// client/src/MapView.jsx
/**
 * MapView — ORCHESTRATION ONLY (FROZEN)
 * ------------------------------------
 * Responsibilities:
 * - Orchestrate map layers (markers, catchments, transport)
 * - Hold cross-domain UI state
 * - Call domain APIs (never raw fetch)
 *
 * Explicitly NOT allowed in this file:
 * ❌ Direct fetch() or HTTP calls
 * ❌ Business logic (eligibility, geometry rules)
 * ❌ DB assumptions or transformations
 *
 * All data logic must live in:
 * - client/src/domains/*
 *
 * This file is intentionally kept thin to support:
 * - 2000+ schools
 * - XLS → DB → UI scaling
 * - Future map performance optimisations
 */

import React, { useState, useEffect } from "react";

import AppLayout from "./components/layout/AppLayout";
import MapCanvas from "./components/map/MapCanvas";

import HomeMarker from "./components/HomeMarker";
import PanToHome from "./components/PanToHome";

import TransportPanel from "./components/transport/TransportPanel";
import TransportRouteLayer from "./components/transport/TransportRouteLayer";
import FitRouteBounds from "./components/transport/FitRouteBounds";
import FitHomeSchoolBounds from "./components/transport/FitHomeSchoolBounds";

// ✅ School markers domain
import SchoolMarkersLayer from "./domains/map/SchoolMarkersLayer";

// Catchment domain
import CatchmentMapLayer from "./domains/catchment/CatchmentMapLayer";
import CatchmentSummary from "./domains/catchment/CatchmentSummary";
import { fetchCatchmentBySchoolId } from "./domains/catchment/catchment.api";

// Home domain
import HomeLocation from "./domains/home/HomeLocation";
import { resolveHomeLocation } from "./domains/home/home.service";

const DEFAULT_HOME_POSITION = [51.35139, -0.169696];
const DEFAULT_RADIUS_COLOR = "#2c3e50";

export default function MapView({ schools }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [catchments, setCatchments] = useState({});

  const [homePostcode, setHomePostcode] = useState("SM5 4NZ");
  const [homePosition, setHomePosition] = useState(DEFAULT_HOME_POSITION);
  const [homeError, setHomeError] = useState(null);

  const [catchmentResults, setCatchmentResults] = useState(null);
  const [catchmentError, setCatchmentError] = useState(null);

  // Transport
  const [activeTransportSchool, setActiveTransportSchool] = useState(null);
  const [activeTransportRoute, setActiveTransportRoute] = useState(null);
  const [hoverTransportRoute, setHoverTransportRoute] = useState(null);

  const schoolsList = Array.isArray(schools) ? schools : [];

  const schoolNameById = Object.fromEntries(
    schoolsList.map((s) => [s.id, s.name])
  );

  const toggleSchool = (schoolId) => {
    setSelectedIds((prev) =>
      prev.includes(schoolId)
        ? prev.filter((id) => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const handleHomePostcodeSubmit = async (postcode) => {
    try {
      setHomeError(null);
      setHomePostcode(postcode);

      const { lat, lon } = await resolveHomeLocation(postcode);
      setHomePosition([lat, lon]);

      setActiveTransportSchool(null);
      setActiveTransportRoute(null);
      setHoverTransportRoute(null);
    } catch (err) {
      setHomeError(err.message || "Geocoding failed");
    }
  };

  /**
   * Fetch catchments via domain API
   */
  useEffect(() => {
    selectedIds.forEach(async (id) => {
      if (catchments[id]) return;

      try {
        const data = await fetchCatchmentBySchoolId(id);
        setCatchments((prev) => ({ ...prev, [id]: data }));
      } catch (e) {
        console.error("❌ catchment load failed for", id, e);
      }
    });
  }, [selectedIds, catchments]);

  const routeActive = !!activeTransportRoute;

  return (
    <AppLayout
      sidebar={
        <>
          <HomeLocation
            defaultPostcode={homePostcode}
            onSubmit={handleHomePostcodeSubmit}
            error={homeError}
          />

          <CatchmentSummary
            homeLocation={{ lat: homePosition[0], lon: homePosition[1] }}
            onResults={setCatchmentResults}
            setError={setCatchmentError}
            error={catchmentError}
            results={catchmentResults}
          />

          <h3 style={{ marginTop: 20 }}>Schools</h3>

          {schoolsList.map((s) => (
            <div
              key={s.id}
              style={{ display: "flex", alignItems: "center", marginBottom: 6 }}
            >
              <label style={{ flex: 1 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggleSchool(s.id)}
                />
                &nbsp;{s.name}
              </label>

              <img
                src="/icons/transport_yellow.png"
                alt="Show transport"
                style={{ width: 20, height: 20, cursor: "pointer" }}
                onClick={() => {
                  setActiveTransportSchool(s);
                  setActiveTransportRoute(null);
                  setHoverTransportRoute(null);
                }}
              />
            </div>
          ))}

          {activeTransportSchool && (
            <TransportPanel
              school={activeTransportSchool}
              homeLocation={{
                lat: homePosition[0],
                lon: homePosition[1],
                postcode: homePostcode,
              }}
              onClose={() => {
                setActiveTransportSchool(null);
                setActiveTransportRoute(null);
                setHoverTransportRoute(null);
              }}
              onSelectRoute={(route) => {
                setActiveTransportRoute(route);
                setHoverTransportRoute(null);
              }}
              onHoverRoute={(route) => {
                if (!activeTransportRoute) {
                  setHoverTransportRoute(route);
                }
              }}
              onLeaveRoute={() => {
                setHoverTransportRoute(null);
              }}
            />
          )}
        </>
      }
      map={
        <MapCanvas>
          <PanToHome position={homePosition} />
          <HomeMarker position={homePosition} postcode={homePostcode} />

          {/* Markers */}
          <SchoolMarkersLayer schools={schoolsList} />

          <TransportRouteLayer
            route={activeTransportRoute || hoverTransportRoute}
          />

          <FitHomeSchoolBounds
            homePosition={homePosition}
            school={activeTransportSchool}
          />

          <FitRouteBounds route={activeTransportRoute} />

          {selectedIds.map((id) => {
            const data = catchments[id];
            if (!data) return null;

            return (
              <CatchmentMapLayer
                key={id}
                data={data}
                radiusColor={DEFAULT_RADIUS_COLOR}
                schoolLabel={schoolNameById[id]}
                dimmed={routeActive}
              />
            );
          })}
        </MapCanvas>
      }
    />
  );
}
