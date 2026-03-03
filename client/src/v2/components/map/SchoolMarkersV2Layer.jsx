// client/src/v2/components/map/SchoolMarkersV2Layer.jsx
import React, { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

const DEFAULT_ICON_URL = "/icons/School_red.png";

// small cache so we don’t recreate Leaflet icons every render
const iconCache = new Map();
function getIcon(url) {
  const iconUrl = url || DEFAULT_ICON_URL;
  if (iconCache.has(iconUrl)) return iconCache.get(iconUrl);

  const icon = L.icon({
    iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  iconCache.set(iconUrl, icon);
  return icon;
}

export default function SchoolMarkersV2Layer({ schools }) {
  const markers = useMemo(() => {
    if (!Array.isArray(schools)) return [];

    return schools
      .map((s) => {
        const lat = Number(s.lat);
        const lon = Number(s.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

        return {
          id: s.id,
          name: s.name,
          pos: [lat, lon],
          iconUrl: s.icon_url || null,
        };
      })
      .filter(Boolean);
  }, [schools]);

  if (markers.length === 0) return null;

  return (
    <>
      {markers.map((m) => (
        <Marker key={`school:${m.id}`} position={m.pos} icon={getIcon(m.iconUrl)}>
          {/* hover-only by default (no permanent) */}
          <Tooltip direction="top" offset={[0, -6]} opacity={1}>
            {m.name}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
