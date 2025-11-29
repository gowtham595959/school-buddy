import React from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const HOME = [51.35, -0.17];

const homeIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [25, 40],
  iconAnchor: [12, 40],
});

export default function MapView({ selectedSchools }) {
  return (
    <MapContainer
      center={HOME}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <Marker position={HOME} icon={homeIcon} />
    </MapContainer>
  );
}
