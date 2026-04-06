import React from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapCanvas({ center = [51.37, -0.22], zoom = 12, children }) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
<TileLayer
  url="https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=zevAZr89M5ksx2bRpvOF"
  attribution='© MapTiler © OpenStreetMap contributors'
  tileSize={256}
  zoomOffset={0}
/>



      {children}
    </MapContainer>
  );
}
