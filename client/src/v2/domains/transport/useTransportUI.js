// client/src/v2/domains/transport/useTransportUI.js

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Transport UI state + handlers for ExplorePage.
 * Includes a safety reset: when home location changes, transport is cleared.
 */
export default function useTransportUI({ homePosition, postcode }) {
  const [transportSchool, setTransportSchool] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [hoverRoute, setHoverRoute] = useState(null);
  const [clearVersion, setClearVersion] = useState(0); // bump to force activeRoute recompute when ref is cleared
  // ✅ NEW: hold last hovered route while inside list so gaps don't fall back to selected
  const stickyPreviewRouteRef = useRef(null);

  const homeLocation = useMemo(() => {
    if (!Array.isArray(homePosition) || homePosition.length !== 2) return null;
    const [lat, lon] = homePosition;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon, postcode };
  }, [homePosition, postcode]);

  // ✅ CHANGE: hover -> sticky preview -> selected
  // clearVersion forces re-run when we clear (ref doesn't trigger re-render)
  const activeRoute = useMemo(() => {
    void clearVersion; // bump via setClearVersion forces recomputation when ref-only preview clears
    return hoverRoute || stickyPreviewRouteRef.current || selectedRoute || null;
  }, [hoverRoute, selectedRoute, clearVersion]);

  const openTransportForSchool = useCallback((school) => {
    setTransportSchool(school || null);
    setSelectedRoute(null);
    setHoverRoute(null);
    stickyPreviewRouteRef.current = null;
  }, []);

  const closeTransport = useCallback(() => {
    setTransportSchool(null);
    setSelectedRoute(null);
    setHoverRoute(null);
    stickyPreviewRouteRef.current = null;
    setClearVersion((v) => v + 1); // Force re-render so route clears from map
  }, []);

  /** Toggle transport panel: opens for school, or closes if already open for this school (same as X). */
  const toggleTransportForSchool = useCallback((school) => {
    setTransportSchool((prev) => (prev?.id === school?.id ? null : school || null));
    setSelectedRoute(null);
    setHoverRoute(null);
    stickyPreviewRouteRef.current = null;
    setClearVersion((v) => v + 1);
  }, []);

  const onSelectRoute = useCallback((route) => {
    setSelectedRoute(route || null);
  }, []);

  const onHoverRoute = useCallback((route) => {
    const r = route || null;
    setHoverRoute(r);
    if (r) stickyPreviewRouteRef.current = r;
  }, []);

  // per-row leave (kept for compatibility)
  const onLeaveRoute = useCallback(() => {
    setHoverRoute(null);
  }, []);

  // ✅ NEW: called when leaving the whole options list/panel area
  // Reverts preview back to selected route (or nothing if none)
  const onLeaveOptionsList = useCallback(() => {
    setHoverRoute(null);
    stickyPreviewRouteRef.current = null;
  }, []);

  // ✅ NEW: explicit clear (removes route overlay altogether)
  const onClearRoute = useCallback(() => {
    setSelectedRoute(null);
    setHoverRoute(null);
    stickyPreviewRouteRef.current = null;
    setClearVersion((v) => v + 1); // Force re-render so activeRoute recalculates
  }, []);

  // ✅ HARD RESET when address/home location changes
  const prevHomeKeyRef = useRef(null);
  useEffect(() => {
    const key = homeLocation
      ? `${homeLocation.postcode || ""}|${homeLocation.lat}|${homeLocation.lon}`
      : `null|${postcode || ""}|${
          Array.isArray(homePosition) ? homePosition.join(",") : ""
        }`;

    if (prevHomeKeyRef.current === null) {
      prevHomeKeyRef.current = key;
      return;
    }

    if (prevHomeKeyRef.current !== key) {
      setTransportSchool(null);
      setSelectedRoute(null);
      setHoverRoute(null);
      stickyPreviewRouteRef.current = null;
      prevHomeKeyRef.current = key;
    }
  }, [homeLocation, postcode, homePosition]);

  return useMemo(
    () => ({
      transportSchool,
      homeLocation,
      selectedRoute,
      hoverRoute,
      activeRoute,

      openTransportForSchool,
      toggleTransportForSchool,
      closeTransport,
      onSelectRoute,
      onHoverRoute,
      onLeaveRoute,

      onLeaveOptionsList,
      onClearRoute,
    }),
    [
      transportSchool,
      homeLocation,
      selectedRoute,
      hoverRoute,
      activeRoute,
      openTransportForSchool,
      toggleTransportForSchool,
      closeTransport,
      onSelectRoute,
      onHoverRoute,
      onLeaveRoute,
      onLeaveOptionsList,
      onClearRoute,
    ]
  );
}
