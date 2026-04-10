import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Phone only: patches Leaflet's getSize() so it returns a height reduced by the bottom card deck.
 * Every Leaflet operation (fitBounds, flyTo centering, getBoundsZoom) then automatically frames
 * content in the visible strip above the cards — no per-call padding hacks or post-move nudges.
 *
 * Returns a real L.Point so all internal Leaflet methods (divideBy, _divideBy, subtract, etc.) work.
 */
export default function PhoneMapViewportClamp() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const original = map.getSize.bind(map);

    function getDeckHeight() {
      if (typeof window === "undefined") return 240;
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--v2-mobile-deck-clearance")
        .trim();
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 240;
    }

    map.getSize = function () {
      const real = original();
      const deckH = getDeckHeight();
      const clampedY = Math.max(100, real.y - deckH);
      return new L.Point(real.x, clampedY);
    };

    map.invalidateSize({ animate: false });

    return () => {
      map.getSize = original;
      map.invalidateSize({ animate: false });
    };
  }, [map]);

  return null;
}
