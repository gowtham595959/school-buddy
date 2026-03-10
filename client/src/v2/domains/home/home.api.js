// client/src/v2/domains/home/home.api.js

/**
 * Home Location API (Frontend)
 * ----------------------------
 * Thin wrapper around backend geocode endpoint.
 *
 * IMPORTANT:
 * - Keep backwards-compatible exports while we refactor gradually.
 * - Use relative /api so CRA proxy handles localhost in dev.
 */

/**
 * Legacy-compatible function name (kept).
 *
 * @param {string} postcode
 * @returns {Promise<{ lat: number, lon: number }>}
 */
export async function fetchLatLonByPostcode(postcode) {
  const safe = encodeURIComponent(String(postcode || "").trim());
  const res = await fetch(`/api/geocode/postcode/${safe}`);

  if (res.status === 404) {
    const err = new Error(`Postcode not found: ${postcode}`);
    err.code = 404;
    throw err;
  }

  if (res.status === 400) {
    // backend returns { error, code } (e.g. POSTCODE_INVALID / POSTCODE_REQUIRED)
    const err = new Error("Invalid postcode");
    err.code = 400;
    throw err;
  }

  if (!res.ok) {
    throw new Error("Unable to resolve postcode");
  }

  const { lat, lon } = await res.json();
  return { lat, lon };
}

/**
 * New canonical name (alias) — use this going forward.
 */
export async function geocodePostcode(postcode) {
  return fetchLatLonByPostcode(postcode);
}
