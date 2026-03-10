import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Pan map to home position when it changes.
 * - Keeps current zoom level
 * - No animation by default (Leaflet smooth pan)
 * - UI-only, reversible
 */
export default function PanToHome({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;

    map.panTo(position);
  }, [position, map]);

  return null;
}
