import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function PanToHomeV2({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !Array.isArray(position) || position.length !== 2) return;

    const [lat, lon] = position;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    // smooth pan; keep zoom as-is
    map.flyTo([lat, lon], map.getZoom(), { duration: 0.6 });
  }, [map, position]);

  return null;
}
