// client/src/v2/components/map/measuredFitBounds.js
import L from "leaflet";

/**
 * Same idea as Leaflet Map#getBoundsZoom, but the viewport size is explicit (e.g. from
 * map.getContainer().getBoundingClientRect()) so zoom matches what the user sees, not a stale
 * clientWidth/height inside Leaflet’s cache — important on mobile WebKit when the flex layout
 * or URL chrome has just changed.
 */
export function getBoundsZoomForSize(map, bounds, inside, paddingSum, sizePoint) {
  const pad = L.point(paddingSum);
  const sz = L.point(sizePoint).subtract(pad);
  if (sz.x <= 0 || sz.y <= 0) return map.getZoom?.() ?? 0;

  bounds = L.latLngBounds(bounds);
  let zoom = map.getZoom() || 0;
  const min = map.getMinZoom();
  const max = map.getMaxZoom();
  const nw = bounds.getNorthWest();
  const se = bounds.getSouthEast();
  const boundsSize = L.bounds(map.project(se, zoom), map.project(nw, zoom)).getSize();
  const snap = L.Browser?.any3d ? map.options.zoomSnap : 1;
  const scalex = sz.x / boundsSize.x;
  const scaley = sz.y / boundsSize.y;
  const scale = inside ? Math.max(scalex, scaley) : Math.min(scalex, scaley);
  zoom = map.getScaleZoom(scale, zoom);
  if (snap) {
    zoom = Math.round(zoom / (snap / 100)) * (snap / 100);
    zoom = inside ? Math.ceil(zoom / snap) * snap : Math.floor(zoom / snap) * snap;
  }
  return Math.max(min, Math.min(max, zoom));
}

/**
 * Equivalent framing to map.fitBounds for given padding, but zoom/center are computed from the
 * container’s layout box (bounding client rect), then applied via setView.
 */
export function fitBoundsUsingContainerRect(map, bounds, options) {
  bounds = L.latLngBounds(bounds);
  if (!bounds.isValid()) return;

  const opts = options || {};
  const paddingTL = L.point(opts.paddingTopLeft || opts.padding || [0, 0]);
  const paddingBR = L.point(opts.paddingBottomRight || opts.padding || [0, 0]);
  const paddingSum = paddingTL.add(paddingBR);

  const container = map.getContainer();
  const rect = container.getBoundingClientRect();
  const w = Math.max(0, rect.width);
  const h = Math.max(0, rect.height);
  const size = L.point(w, h);

  let zoom = getBoundsZoomForSize(map, bounds, false, paddingSum, size);
  if (typeof opts.maxZoom === "number") {
    zoom = Math.min(opts.maxZoom, zoom);
  }
  zoom = Math.max(map.getMinZoom(), zoom);

  if (!Number.isFinite(zoom) || zoom === Infinity) {
    map.setView(bounds.getCenter(), map.getZoom(), { animate: !!opts.animate });
    return;
  }

  const paddingOffset = paddingBR.subtract(paddingTL).divideBy(2);
  const swPoint = map.project(bounds.getSouthWest(), zoom);
  const nePoint = map.project(bounds.getNorthEast(), zoom);
  const center = map.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom);

  map.setView(center, zoom, { animate: !!opts.animate });
}
