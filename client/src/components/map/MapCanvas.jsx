import React from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/**
 * MapCanvas
 * ----------
 * Leaflet shell only.
 *
 * Responsibilities:
 * - Own MapContainer
 * - Own TileLayer
 * - Render children inside map
 *
 * IMPORTANT:
 * - No domain logic
 * - No state
 * - No side effects
 */
export default function MapCanvas({
  center = [51.37, -0.22],
  zoom = 12,
  children,
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />
      {children}
    </MapContainer>
  );
}
