import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Phone: PhoneMapViewportClamp patches getSize() so Leaflet frames within the visible strip.
 * No phone-specific padding needed — same simple padding for both layouts.
 */
export default function FitHomeSchoolBounds({ homePosition, school }) {
  const map = useMap();

  useEffect(() => {
    if (!homePosition || !school?.lat || !school?.lon) return;

    const bounds = L.latLngBounds([
      [homePosition[0], homePosition[1]],
      [school.lat, school.lon],
    ]);

    map.fitBounds(bounds, {
      padding: [60, 60],
      animate: true,
    });
  }, [homePosition, school, map]);

  return null;
}
