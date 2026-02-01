// client/src/domains/map/marker.service.js

/**
 * Marker Service
 * --------------
 * Prepares school data for marker rendering.
 *
 * IMPORTANT:
 * - No Leaflet imports
 * - No UI logic
 * - No filtering
 * - Behaviour must remain IDENTICAL to legacy MarkerLayer usage
 */

/**
 * Prepare marker input data from schools list.
 *
 * @param {Array} schools
 * @returns {Array}
 */
export function prepareSchoolMarkers(schools) {
  if (!Array.isArray(schools)) return [];

  return schools
    .filter((s) => s && s.lat != null && s.lon != null)
    .map((s) => ({
      id: s.id,
      name: s.name,
      lat: Number(s.lat),
      lon: Number(s.lon),
      school: s, // pass-through for now (non-breaking)
    }));
}
