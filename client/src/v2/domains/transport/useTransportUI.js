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

  // ✅ NEW: hold last hovered route while inside list so gaps don't fall back to selected
  const stickyPreviewRouteRef = useRef(null);

  const homeLocation = useMemo(() => {
    if (!Array.isArray(homePosition) || homePosition.length !== 2) return null;
    const [lat, lon] = homePosition;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon, postcode };
  }, [homePosition, postcode]);

  // ✅ CHANGE: hover -> sticky preview -> selected
  const activeRoute = useMemo(() => {
    return hoverRoute || stickyPreviewRouteRef.current || selectedRoute || null;
  }, [hoverRoute, selectedRoute]);

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

  return {
    transportSchool,
    homeLocation,
    selectedRoute,
    hoverRoute,
    activeRoute,

    openTransportForSchool,
    closeTransport,
    onSelectRoute,
    onHoverRoute,
    onLeaveRoute,

    // ✅ new (additive)
    onLeaveOptionsList,
    onClearRoute,
  };
}
