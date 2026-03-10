// client/src/v2/domains/home/ukPostcode.js

export function normalizeUkPostcode(value) {
  return String(value || "").trim().toUpperCase();
}

// Same minimal regex you used (legacy-equivalent behavior)
export function isValidUkPostcode(value) {
  const cleaned = String(value || "").replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(cleaned);
}
