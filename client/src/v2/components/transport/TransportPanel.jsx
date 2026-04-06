// client/src/v2/components/transport/TransportPanel.jsx

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import TransportButton from "./TransportButton";
import { fetchTransportRoute } from "../../domains/transport/transport.api";

const MODE_LABELS = {
  driving: "🚗",
  transit: "🚌",
  walking: "🚶",
  bicycling: "🚴",
};

const MODE_TITLES = {
  driving: "Driving",
  transit: "Transit",
  walking: "Walking",
  bicycling: "Cycling",
};

function sortRouteOptions(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  arr.sort((a, b) => {
    const da = Number(a?.duration_minutes);
    const db = Number(b?.duration_minutes);
    const aBad = !Number.isFinite(da);
    const bBad = !Number.isFinite(db);
    if (aBad && bBad) return 0;
    if (aBad) return 1;
    if (bBad) return -1;
    if (da !== db) return da - db;
    const xa = Number(a?.distance_km);
    const xb = Number(b?.distance_km);
    const xaBad = !Number.isFinite(xa);
    const xbBad = !Number.isFinite(xb);
    if (xaBad && xbBad) return 0;
    if (xaBad) return 1;
    if (xbBad) return -1;
    if (xa !== xb) return xa - xb;
    return (a?.optionIndex ?? 0) - (b?.optionIndex ?? 0);
  });
  return arr;
}

export default function TransportPanel({
  school,
  homeLocation,
  onClose,
  onSelectRoute,

  // ✅ ADDITIVE (safe if unused)
  onHoverRoute,
  onLeaveRoute,

  // ✅ NEW (additive): clears sticky hover + reverts to selected
  onLeaveOptionsList,

  // ✅ NEW (additive): explicit clear (removes route from map)
  onClearRoute,

  /** Phone bottom-card: short title, smaller controls */
  compactMobile = false,
}) {
  const [loading, setLoading] = useState(false);
  const [transportData, setTransportData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);

  // ✅ active mode tab
  const [selectedMode, setSelectedMode] = useState(null);
  const autoDefaultDoneForPayloadRef = useRef(null);

  const titleFrom = homeLocation?.postcode || "Home";
  const titleTo = school?.name || "";

  const payload = useMemo(() => {
    const home_lat = Number(homeLocation?.lat);
    const home_lon = Number(homeLocation?.lon);
    const school_id = Number(school?.id);
    if ([home_lat, home_lon, school_id].some((v) => Number.isNaN(v))) return null;
    return { home_lat, home_lon, school_id };
  }, [homeLocation?.lat, homeLocation?.lon, school?.id]);

  useEffect(() => {
    if (!payload) return;

    autoDefaultDoneForPayloadRef.current = null;
    setLoading(true);
    setError(null);
    setTransportData(null);
    setSelectedKey(null);
    setSelectedMode(null);

    fetchTransportRoute(payload)
      .then((data) => {
        setTransportData(data);
      })
      .catch((err) => {
        const msg = err?.message || "Failed to load transport options";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [payload]);

  const groupedRoutes = useMemo(() => {
    const routes = transportData?.routes || [];
    const grouped = {};

    for (const modeRoute of routes) {
      const mode = modeRoute.mode;
      if (!grouped[mode]) grouped[mode] = [];

      const options =
        Array.isArray(modeRoute.options) && modeRoute.options.length > 0
          ? modeRoute.options
          : [
              {
                option_index: 0,
                duration_minutes: modeRoute.duration_minutes,
                distance_km: modeRoute.distance_km,
                polyline: modeRoute.polyline,
              },
            ];

      options.forEach((opt) => {
        grouped[mode].push({
          ...opt,
          mode,
          optionIndex: opt.option_index ?? 0,
        });
      });
    }

    return grouped;
  }, [transportData]);

  // ✅ Determine available modes + default selection
  const availableModes = Object.keys(groupedRoutes);
  const activeMode = selectedMode || availableModes[0];

  // ✅ sort options shortest → longest (stable, minimal)
  const sortedActiveOptions = useMemo(() => {
    const activeOptions = groupedRoutes[activeMode] || [];
    return sortRouteOptions(activeOptions);
  }, [groupedRoutes, activeMode]);

  const selectModeAndFirstOption = useCallback(
    (mode) => {
      setSelectedMode(mode);
      const sorted = sortRouteOptions(groupedRoutes[mode] || []);
      const first = sorted[0];
      if (first) {
        setSelectedKey(`${mode}:0`);
        onSelectRoute?.(first);
      } else {
        setSelectedKey(null);
        onClearRoute?.();
        onLeaveOptionsList?.();
      }
    },
    [groupedRoutes, onSelectRoute, onClearRoute, onLeaveOptionsList]
  );

  // After routes load: prefer transit tab + first (fastest) option on map — desktop + mobile.
  useLayoutEffect(() => {
    if (loading || error || !payload || !transportData) return;
    const modes = Object.keys(groupedRoutes);
    if (modes.length === 0) return;

    const sig = `${payload.home_lat}|${payload.home_lon}|${payload.school_id}`;
    if (autoDefaultDoneForPayloadRef.current === sig) return;

    const pickMode =
      groupedRoutes.transit?.length > 0 ? "transit" : modes[0];
    selectModeAndFirstOption(pickMode);

    autoDefaultDoneForPayloadRef.current = sig;
  }, [
    loading,
    error,
    payload,
    transportData,
    groupedRoutes,
    selectModeAndFirstOption,
  ]);

  const headerTitle = compactMobile
    ? "Home to school"
    : `${titleFrom} to ${titleTo}`;

  const shellPad = compactMobile ? 8 : 12;
  const shellMarginTop = compactMobile ? 6 : 12;

  return (
    <div
      className={compactMobile ? "v2-transport-panel v2-transport-panel--compact-mobile" : undefined}
      style={{
        marginTop: shellMarginTop,
        padding: shellPad,
        border: "1px solid #ddd",
        borderRadius: 10,
        background: "#fafafa",
        display: "flex",
        flexDirection: "column",
        maxHeight: compactMobile ? "min(50vh, 320px)" : "65vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: compactMobile ? 4 : 6,
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: compactMobile ? 600 : 700,
              fontSize: compactMobile ? 12 : undefined,
            }}
          >
            {headerTitle}
          </div>
          {!compactMobile ? (
            <div style={{ fontSize: 12, color: "#666", fontStyle: "italic" }}>
              (Monday 7:00 AM)
            </div>
          ) : (
            <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
              Monday 7:00 AM
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: compactMobile ? 6 : 8, flexShrink: 0 }}>
          <button
            onClick={() => {
              setSelectedKey(null);
              onClearRoute?.();
              // revert any hover preview immediately too
              onLeaveOptionsList?.();
            }}
            style={{
              cursor: "pointer",
              border: "none",
              background: "transparent",
              color: "#666",
              fontSize: compactMobile ? 11 : 12,
              textDecoration: "underline",
              padding: 0,
            }}
            title="Clear route from map"
          >
            Clear route
          </button>

          <button
            onClick={() => {
              onClearRoute?.();
              onLeaveOptionsList?.();
              onClose?.();
            }}
            style={{ cursor: "pointer", fontSize: compactMobile ? 16 : undefined }}
            title="Close transport and clear route from map"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      {!loading && !error && availableModes.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: compactMobile ? 4 : 6,
            marginBottom: compactMobile ? 6 : 8,
          }}
        >
          {availableModes.map((mode) => (
            <button
              key={mode}
              onClick={() => selectModeAndFirstOption(mode)}
              title={MODE_TITLES[mode] || mode}
              style={{
                flex: 1,
                padding: compactMobile ? "4px 0" : "6px 0",
                borderRadius: 6,
                border:
                  activeMode === mode
                    ? compactMobile
                      ? "1.5px solid #1a73e8"
                      : "2px solid #1a73e8"
                    : "1px solid #ccc",
                background: activeMode === mode ? "#e8f0fe" : "#fff",
                cursor: "pointer",
                fontSize: compactMobile ? 13 : 16,
                lineHeight: 1.1,
              }}
            >
              {MODE_LABELS[mode] || mode}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        style={{
          overflowY: "auto",
          overscrollBehavior: "contain",
          paddingRight: 4,
        }}
        // ✅ Key: when leaving the whole list area, revert preview back to selected
        onMouseLeave={() => onLeaveOptionsList?.()}
      >
        {loading && <div>Loading transport…</div>}

        {error && <div style={{ color: "red", fontSize: 12, marginBottom: 8 }}>{error}</div>}

        {!loading && !error && !payload && (
          <div style={{ fontSize: 12, color: "#666" }}>
            Set your home postcode to see transport options.
          </div>
        )}

        {!loading &&
          !error &&
          payload &&
          availableModes.length === 0 && (
          <div style={{ fontSize: 12, color: "#666" }}>
            No transport options could be loaded. Ensure the server has a valid
            Google Maps API key with Directions API enabled.
          </div>
        )}

        {!loading &&
          !error &&
          sortedActiveOptions.map((opt, sortedIndex) => {
            const key = `${activeMode}:${sortedIndex}`;
            return (
              <TransportButton
                key={key}
                route={opt}
                optionIndex={sortedIndex}
                compact={compactMobile}
                isActive={selectedKey === key}
                onClick={() => {
                  setSelectedKey(key);
                  onSelectRoute?.(opt);
                }}
                onMouseEnter={() => onHoverRoute?.(opt)}
                // ✅ DO NOT clear on each row (gaps cause flicker)
                // onMouseLeave intentionally not used
                onMouseLeave={() => {
                  // keep backward-compat safe: still call if provided, but it won't be used for clearing preview
                  onLeaveRoute?.();
                }}
              />
            );
          })}
      </div>
    </div>
  );
}
