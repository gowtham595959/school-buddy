import React, { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

// ✅ Use the same PNG icon as legacy (no new behavior, just restoring asset)
const HOME_ICON = new L.Icon({
  iconUrl: "/icons/home_Board_opaque.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  tooltipAnchor: [0, -28],
});

export default function HomeMarkerV2Layer({ position }) {
  const pos = useMemo(() => {
    if (!Array.isArray(position) || position.length !== 2) return null;
    const [lat, lon] = position;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return [lat, lon];
  }, [position]);

  if (!pos) return null;

  return (
    <Marker position={pos} icon={HOME_ICON}>
      <Tooltip direction="top" offset={[0, -6]} opacity={1}>
        Home
      </Tooltip>
    </Marker>
  );
}
