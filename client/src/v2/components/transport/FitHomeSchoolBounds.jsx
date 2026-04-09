import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { mobileFitBoundsBottomPaddingPx } from "../map/FitCatchmentBounds";

export default function FitHomeSchoolBounds({ homePosition, school }) {
  const map = useMap();
  const isPhone = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    if (!homePosition || !school?.lat || !school?.lon) return;

    const bounds = L.latLngBounds([
      [homePosition[0], homePosition[1]],
      [school.lat, school.lon],
    ]);

    /*
     * Phone: frame home→school in one fit using bottom padding tied to the card deck (same as catchment).
     * Avoid a second moveend pan (“optical nudge”) — with animated fitBounds it read as ~3 separate motions.
     */
    if (isPhone) {
      map.fitBounds(bounds, {
        paddingTopLeft: [16, 68],
        paddingBottomRight: [16, mobileFitBoundsBottomPaddingPx()],
        animate: true,
        maxZoom: 16,
      });
      return undefined;
    }

    map.fitBounds(bounds, {
      padding: [80, 80],
      animate: true,
    });

    return undefined;
  }, [homePosition, school, map, isPhone]);

  return null;
}
