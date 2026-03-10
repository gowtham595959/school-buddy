// client/src/domains/catchment/catchment.styles.js

/**
 * Catchment style helpers (Domain)
 *
 * IMPORTANT:
 * - No rendering here
 * - No fetch calls here
 * - Pure functions only
 * - Safe fallbacks when styles are missing
 */

/**
 * Convert DB style row -> Leaflet polygon style object.
 *
 * @param {Object|null} styleRow
 * @param {Object} [fallback]
 * @returns {Object}
 */
export function toLeafletPolygonStyle(styleRow, fallback = {}) {
  if (!styleRow) {
    return { ...fallback };
  }

  // Some legacy columns may exist (border_color / opacity), but we prefer V2.
  const strokeColor = styleRow.stroke_color ?? styleRow.border_color;
  const strokeOpacity = styleRow.stroke_opacity ?? styleRow.opacity;
  const fillOpacity = styleRow.fill_opacity ?? styleRow.opacity;

  return {
    color: strokeColor ?? fallback.color,
    weight: styleRow.stroke_weight ?? fallback.weight,
    opacity: strokeOpacity ?? fallback.opacity,
    fillColor: styleRow.fill_color ?? fallback.fillColor,
    fillOpacity: fillOpacity ?? fallback.fillOpacity,
  };
}

/**
 * Convert DB style row -> radius rendering config.
 * (Your RadiusLayer uses props like { color, opacity } already.)
 *
 * @param {Object|null} styleRow
 * @param {Object} [fallback]
 * @returns {Object}
 */
export function toRadiusStyle(styleRow, fallback = {}) {
  if (!styleRow) {
    return { ...fallback };
  }

  const strokeColor = styleRow.stroke_color ?? styleRow.border_color;
  const strokeOpacity = styleRow.stroke_opacity ?? styleRow.opacity;

  return {
    color: strokeColor ?? fallback.color,
    opacity: strokeOpacity ?? fallback.opacity,
    weight: styleRow.stroke_weight ?? fallback.weight,
  };
}

/**
 * Safe helper: pick a layer style from the API `styles` object.
 *
 * API example:
 * styles = { outer: {...}, individual: {...}, radius: {...} }
 *
 * @param {Object|null|undefined} styles
 * @param {string} key
 * @returns {Object|null}
 */
export function pickStyle(styles, key) {
  if (!styles) return null;
  return styles[key] || null;
}
