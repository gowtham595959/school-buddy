import { useEffect } from "react";
import { useMap } from "react-leaflet";
import polyline from "@mapbox/polyline";
import L from "leaflet";

export default function FitRouteBounds({ route }) {
  const map = useMap();

  useEffect(() => {
    if (!route) return;

    let latLngs = [];

    // Transit route: collect all step polylines
    if (route.mode === "transit" && Array.isArray(route.steps)) {
      route.steps.forEach((step) => {
        if (!step.polyline) return;
        const points = polyline.decode(step.polyline);
        points.forEach(([lat, lng]) => {
          latLngs.push([lat, lng]);
        });
      });
    }

    // Non-transit route: single polyline
    if (route.polyline) {
      const points = polyline.decode(route.polyline);
      points.forEach(([lat, lng]) => {
        latLngs.push([lat, lng]);
      });
    }

    if (latLngs.length === 0) return;

    const bounds = L.latLngBounds(latLngs);

    map.fitBounds(bounds, {
      padding: [60, 60],
      animate: true,
    });
  }, [route, map]);

  return null;
}
