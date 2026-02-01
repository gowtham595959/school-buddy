// client/src/domains/catchment/catchment.api.js
// Catchment Domain API
// Canonical source for all catchment-related backend calls.
// Geometry + eligibility are intentionally separated.


// 1) Geometry — used by MapView to DRAW catchments
export async function fetchCatchmentBySchoolId(schoolId) {
  const res = await fetch(`/api/catchments/${schoolId}`);
  if (!res.ok) {
    throw new Error("Failed to load catchment geometry");
  }
  return res.json();
}

// 2) Eligibility (LEGACY, non-breaking)
// UI currently relies on /api/catchment-check with {home_lat, home_lon}
export async function fetchCatchmentEligibility(payload) {
  const res = await fetch(`/api/catchment-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Catchment check failed");
  }

  return res.json();
}

// 3) Future endpoint (kept for later — do not wire UI yet)
export async function fetchCatchmentEligibilityV2(payload) {
  const res = await fetch(`/api/catchment/eligibility`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch eligibility");
  }

  return res.json();
}
