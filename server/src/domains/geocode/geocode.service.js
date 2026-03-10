// server/src/domains/geocode/geocode.service.js

class GeocodeError extends Error {
  constructor(message, status = 500, code = "GEOCODE_ERROR") {
    super(message);
    this.name = "GeocodeError";
    this.status = status;
    this.code = code;
  }
}

function normalizePostcode(input) {
  const raw = String(input || "");
  const cleaned = raw.replace(/\s+/g, "").toUpperCase();

  // We keep this intentionally light-touch to avoid rejecting edge cases.
  // But we do prevent empty / obviously bad input.
  if (!cleaned) {
    throw new GeocodeError("Postcode is required", 400, "POSTCODE_REQUIRED");
  }
  if (cleaned.length < 5) {
    throw new GeocodeError("Invalid postcode", 400, "POSTCODE_INVALID");
  }

  return cleaned;
}

/**
 * geocodePostcode
 * - UI-only geocoding (no DB, no persistence)
 * - uses Node 18+ native fetch
 * - upstream: Nominatim (OSM)
 *
 * Returns: { lat: number, lon: number }
 * Throws: GeocodeError with status + code
 */
async function geocodePostcode(postcodeInput) {
  const postcode = normalizePostcode(postcodeInput);

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(postcode)}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "school-buddy/1.0",
      },
    });
  } catch (err) {
    // network/DNS/etc
    throw new GeocodeError("Geocoding upstream unreachable", 502, "UPSTREAM_UNREACHABLE");
  }

  if (!response.ok) {
    throw new GeocodeError("Geocoding upstream error", 502, "UPSTREAM_ERROR");
  }

  let results;
  try {
    results = await response.json();
  } catch (err) {
    throw new GeocodeError("Geocoding upstream invalid JSON", 502, "UPSTREAM_BAD_JSON");
  }

  if (!results || results.length === 0) {
    throw new GeocodeError("Postcode not found", 404, "POSTCODE_NOT_FOUND");
  }

  const lat = parseFloat(results[0].lat);
  const lon = parseFloat(results[0].lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new GeocodeError("Geocoding upstream returned invalid coordinates", 502, "UPSTREAM_BAD_COORDS");
  }

  return { lat, lon };
}

module.exports = {
  GeocodeError,
  geocodePostcode,
};
