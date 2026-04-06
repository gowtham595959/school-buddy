// client/src/v2/components/map/phoneMapOpticalNudge.js
import L from "leaflet";

/** Share of map height to pan (positive Leaflet Y = shift on-screen content upward; clears bottom card deck). */
export const PHONE_MAP_OPTICAL_PAN_FRAC = 0.2;

export function applyPhoneMapOpticalNudge(map) {
  if (!map || typeof map.getSize !== "function") return;
  const h = map.getSize().y;
  if (h > 0) {
    map.panBy(L.point(0, Math.round(h * PHONE_MAP_OPTICAL_PAN_FRAC)), {
      animate: false,
      noMoveStart: true,
    });
  }
}

/**
 * Call once when a programmatic move (e.g. flyTo) has finished — mobile only.
 * Caller is responsible for gating on viewport / isPhone.
 */
export function nudgeMapAfterProgrammaticMove(map) {
  requestAnimationFrame(() => applyPhoneMapOpticalNudge(map));
}
