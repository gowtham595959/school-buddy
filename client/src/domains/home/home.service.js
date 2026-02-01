// client/src/domains/home/home.service.js

/**
 * Home Location Service
 * ---------------------
 * Orchestrates postcode → lat/lon resolution.
 *
 * IMPORTANT:
 * - No UI concerns
 * - Behaviour must remain IDENTICAL to legacy MapView logic
 */

import { fetchLatLonByPostcode } from "./home.api";

/**
 * Resolve a postcode into a home location.
 *
 * @param {string} postcode
 * @returns {Promise<{ lat: number, lon: number }>}
 */
export async function resolveHomeLocation(postcode) {
  if (!postcode || typeof postcode !== "string") {
    throw new Error("Invalid postcode");
  }

  const trimmed = postcode.trim();
  if (!trimmed) {
    throw new Error("Invalid postcode");
  }

  try {
    return await fetchLatLonByPostcode(trimmed);
  } catch (err) {
    // Preserve legacy semantics
    if (err && err.code === 404) throw err;
    throw new Error("Unable to resolve postcode");
  }
}
