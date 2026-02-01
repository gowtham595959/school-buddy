import React, { useEffect, useMemo, useState } from "react";
import TransportButton from "./TransportButton";
import { fetchTransportRoute } from "./transportApi";

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

export default function TransportPanel({
  school,
  homeLocation,
  onClose,
  onSelectRoute,

  // ✅ ADDITIVE (safe if unused)
  onHoverRoute,
  onLeaveRoute,
}) {
  const [loading, setLoading] = useState(false);
  const [transportData, setTransportData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);

  // ✅ NEW: active mode tab
  const [selectedMode, setSelectedMode] = useState(null);

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
  const activeOptions = groupedRoutes[activeMode] || [];

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid #ddd",
        borderRadius: 10,
        background: "#fafafa",
        display: "flex",
        flexDirection: "column",
        maxHeight: "65vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>
            {titleFrom} to {titleTo}
          </div>
          <div style={{ fontSize: 12, color: "#666", fontStyle: "italic" }}>
            (Monday 7:00 AM)
          </div>
        </div>
        <button onClick={onClose} style={{ cursor: "pointer" }}>
          ✕
        </button>
      </div>

      {/* ✅ Mode tabs (icons only) */}
      {!loading && !error && availableModes.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 8,
          }}
        >
          {availableModes.map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              title={MODE_TITLES[mode] || mode}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 6,
                border:
                  activeMode === mode
                    ? "2px solid #1a73e8"
                    : "1px solid #ccc",
                background:
                  activeMode === mode ? "#e8f0fe" : "#fff",
                cursor: "pointer",
                fontSize: 16,
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
      >
        {loading && <div>Loading transport…</div>}

        {error && (
          <div style={{ color: "red", fontSize: 12 }}>{error}</div>
        )}

        {!loading &&
          !error &&
          activeOptions.map((opt) => {
            const key = `${activeMode}:${opt.optionIndex}`;
            return (
              <TransportButton
                key={key}
                route={opt}
                optionIndex={opt.optionIndex}
                isActive={selectedKey === key}
                onClick={() => {
                  setSelectedKey(key);
                  onSelectRoute?.(opt);
                }}
                onMouseEnter={() => onHoverRoute?.(opt)}
                onMouseLeave={() => onLeaveRoute?.()}
              />
            );
          })}
      </div>
    </div>
  );
}
